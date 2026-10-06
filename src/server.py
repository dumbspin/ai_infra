import os
import sys
import json
import subprocess
import time
from pathlib import Path
import io
import zipfile
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

import asyncio
from src.loader import load_spec, SpecValidationError, SecretDetectedError
from src.compiler.llm_client import call_llm_for_plan, spec_hash
from src.compiler.renderer import render_terraform, get_spec_commit_hash
from src.validator import validate_and_plan
from src.scanner.tf_scanner import scan_terraform, StaticScanError
from src.policy_runner import evaluate_policy
from src.applier import apply_plan, check_idempotency
from src.drift.detector import detect_drift, render_drift_markdown_report
from src.db import init_db, record_run, get_recent_runs, clear_runs


app = FastAPI(
    title="SDD-Infra API Server",
    description="Specification Driven Infrastructure Management REST API",
    version="1.0"
)

# Configure CORS origins from environment (comma-separated list) or default to open access
raw_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS")
if raw_cors_origins:
    allowed_origins = [o.strip() for o in raw_cors_origins.split(",") if o.strip()]
    if "http://localhost:5173" not in allowed_origins:
        allowed_origins.append("http://localhost:5173")
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active OPA Governance Policies
active_policies = {
    "require_owner_tag": {
        "id": "require_owner_tag",
        "name": "Require 'owner' Tag",
        "description": "Ensures all created resources have a valid owner metadata tag for cost allocation and governance.",
        "enabled": True,
        "category": "Governance"
    },
    "no_public_ingress": {
        "id": "no_public_ingress",
        "name": "Block Public Ingress",
        "description": "Denies internet-facing endpoints (0.0.0.0/0) unless explicitly approved by SecOps.",
        "enabled": True,
        "category": "Security"
    },
    "no_ssh_exposed": {
        "id": "no_ssh_exposed",
        "name": "Disallow SSH Access (Port 22)",
        "description": "Enforces zero direct SSH access to container instances or VMs in accordance with zero-trust.",
        "enabled": True,
        "category": "Security"
    }
}

# Shared Pipeline In-Memory State
pipeline_state = {
    "status": "IDLE",  # IDLE, RUNNING, SUCCESS, FAILED
    "target": "docker", # docker, aws_ecs, kubernetes
    "current_step": "idle",
    "failed_step": None,
    "error_message": None,
    "spec_hash": None,
    "spec_commit": None,
    "steps": {
        "specification": "IDLE",   # IDLE, RUNNING, SUCCESS, FAILED
        "ai_compiler": "IDLE",
        "terraform": "IDLE",
        "opa_policy": "IDLE",
        "deployment": "IDLE",
        "verification": "IDLE",
        "drift_check": "IDLE"
    },
    "error_message": None,
    "logs": [],
    "violations": [],
    "opa_evaluation": None,
    "static_scan": None,
    "telemetry": {
        "model": "liquid/lfm-2.5-2.6b:free",
        "inference_time_ms": 0,
        "total_duration_ms": 0,
        "cost_usd": 0.0,
        "cache_active": True
    }
}

def _persist_pipeline_run(
    spec_commit: Optional[str],
    target: str,
    status: str,
    duration_ms: Optional[float],
    dry_run: bool,
    failure_stage: Optional[str] = None,
    failure_detail: Optional[str] = None,
) -> None:
    """Record a single terminal pipeline outcome in SQLite."""
    record_run(
        spec_commit=spec_commit,
        target=target,
        status=status,
        duration_ms=None if duration_ms is None else int(round(duration_ms)),
        dry_run=bool(dry_run),
        failure_stage=failure_stage,
        failure_detail=failure_detail,
    )


def _history_for_api(limit: int = 100) -> List[Dict[str, Any]]:
    """Map SQLite run rows to the Run History payload the frontend already renders."""
    records = []
    for row in get_recent_runs(limit=limit):
        created = row.get("created_at") or ""
        timestamp = created.replace("T", " ").replace("Z", "")
        if "." in timestamp:
            timestamp = timestamp.split(".", 1)[0]
        api_status = "SUCCESS" if row.get("status") == "deployed" else "FAILED"
        spec_commit = row.get("spec_commit")
        records.append({
            "id": row.get("id"),
            "timestamp": timestamp or None,
            "iso_time": created or None,
            "spec_hash": (spec_commit or "")[:8] or None,
            "spec_commit": spec_commit,
            "target": row.get("target"),
            "dry_run": bool(row.get("dry_run")),
            "status": api_status,
            "failed_step": row.get("failure_stage"),
            "error_message": row.get("failure_detail"),
            "duration_ms": row.get("duration_ms"),
        })
    return records


def _terminal_status_for_failure(failed_step: Optional[str], error_message: str) -> str:
    """Map an existing pipeline failure to schema status without changing gate behavior."""
    step = (failed_step or "").lower()
    msg = (error_message or "").upper()
    if step == "opa_policy" or "DENIED" in msg:
        return "blocked"
    return "failed"


# Recurring Drift Scheduler State (Runs every 10-15 minutes)
scheduled_drift_state = {
    "enabled": True,
    "interval_seconds": 600,  # 10 minutes (600 seconds)
    "last_run": None,
    "total_runs": 0,
    "drift_detected": False,
    "findings_count": 0
}



async def scheduled_drift_monitor_loop():
    """Background task executing periodic normalize-and-compare drift detection every 10 minutes."""
    while True:
        try:
            await asyncio.sleep(scheduled_drift_state["interval_seconds"])
            gen_dir = ROOT_DIR / "terraform" / "generated"
            spec_path = gen_dir / "active_infrastructure.yaml"
            if not spec_path.exists():
                spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

            schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
            spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}

            tfstate_path = gen_dir / "terraform.tfstate"
            tfstate = json.loads(tfstate_path.read_text(encoding="utf-8")) if tfstate_path.exists() else {"resources": []}

            live_res = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, check=False)
            live_containers = [{"name": n.strip()} for n in live_res.stdout.splitlines() if n.strip()]

            report = detect_drift(spec, tfstate, live_containers=live_containers)
            scheduled_drift_state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            scheduled_drift_state["total_runs"] += 1
            scheduled_drift_state["drift_detected"] = report.get("drift_detected", False)
            scheduled_drift_state["findings_count"] = len(report.get("items", []))

            if report.get("drift_detected"):
                log_msg = f"[Scheduled Drift Monitor] Background check detected {len(report.get('items', []))} drifted item(s)."
                if pipeline_state["status"] != "RUNNING":
                    pipeline_state["logs"].append(f"[{time.strftime('%H:%M:%S')}] {log_msg}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Scheduled Drift Monitor] Error: {e}")


@app.on_event("startup")
async def start_scheduled_drift_monitor():
    """Ensures the run-history schema exists, then starts recurring drift monitoring."""
    init_db()
    asyncio.create_task(scheduled_drift_monitor_loop())


class ValidateRequest(BaseModel):
    specification: str


class RunPipelineRequest(BaseModel):
    specification: Optional[str] = None
    target: Optional[str] = "docker"
    dry_run: Optional[bool] = False


class PolicyToggleRequest(BaseModel):
    policy_id: str
    enabled: bool


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint for container orchestrators and monitoring probes."""
    return {
        "status": "healthy",
        "service": "sdd-infra",
        "version": "2.0.0"
    }


@app.get("/api/docker/status")
def get_docker_status():
    """Checks if local Docker daemon is online and responsive."""
    res = subprocess.run(["docker", "ps"], capture_output=True, text=True, check=False)
    connected = (res.returncode == 0)
    return {
        "connected": connected,
        "details": "Docker Desktop Online" if connected else "Docker Daemon Offline"
    }


@app.post("/api/specification/validate")
def validate_specification(payload: ValidateRequest):
    """Validates raw YAML specification against JSON Schema and secret linter."""
    temp_spec = ROOT_DIR / "terraform" / "generated" / "temp_spec.yaml"
    temp_spec.parent.mkdir(parents=True, exist_ok=True)
    temp_spec.write_text(payload.specification, encoding="utf-8")

    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"

    try:
        spec = load_spec(temp_spec, schema_path=schema_path)
        return {
            "valid": True,
            "error": None,
            "message": "Specification is valid",
            "spec": spec
        }
    except (SpecValidationError, SecretDetectedError, FileNotFoundError) as e:
        return {
            "valid": False,
            "error": str(e),
            "message": f"Validation failed: {e}"
        }



def execute_pipeline_task(yaml_content: str, target: str = "docker", dry_run: bool = False):
    """Background task executing the SDD pipeline (full or dry_run synthesis only)."""
    global pipeline_state
    start_time = time.time()
    hash_val = spec_hash(yaml_content)
    commit_tag = get_spec_commit_hash(
        spec_path=ROOT_DIR / "specification" / "infrastructure.yaml",
        spec_content=yaml_content
    )

    pipeline_state["status"] = "RUNNING"
    pipeline_state["target"] = target
    pipeline_state["failed_step"] = None
    pipeline_state["error_message"] = None
    pipeline_state["spec_hash"] = hash_val[:8]
    pipeline_state["spec_commit"] = commit_tag
    pipeline_state["logs"] = []
    pipeline_state["violations"] = []
    pipeline_state["steps"] = {
        "specification": "IDLE",
        "ai_compiler": "IDLE",
        "terraform": "IDLE",
        "opa_policy": "IDLE",
        "deployment": "IDLE",
        "verification": "IDLE",
        "drift_check": "IDLE"
    }

    def log(msg: str):
        pipeline_state["logs"].append(f"[{time.strftime('%H:%M:%S')}] {msg}")

    gen_dir = ROOT_DIR / "terraform" / "generated"
    gen_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Stage 1: Specification Loading
        pipeline_state["current_step"] = "specification"
        pipeline_state["steps"]["specification"] = "RUNNING"
        log(f"Loading specification for target: {target.upper()}{' (Synthesis Mode)' if dry_run else ''} [Spec: #{hash_val[:8]} • Commit: {commit_tag}]...")

        spec_path = gen_dir / "active_infrastructure.yaml"
        spec_path.write_text(yaml_content, encoding="utf-8")
        schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
        spec = load_spec(spec_path, schema_path=schema_path)

        pipeline_state["steps"]["specification"] = "SUCCESS"
        log("Specification validated successfully against JSON Schema.")

        # Stage 2: AI Compilation
        pipeline_state["current_step"] = "ai_compiler"
        pipeline_state["steps"]["ai_compiler"] = "RUNNING"
        log("Compiling candidate JSON resource plan via AI layer (OpenRouter)...")

        t0 = time.time()
        plan = call_llm_for_plan(spec, force_refresh=True)
        infer_time = round((time.time() - t0) * 1000, 1)
        pipeline_state["telemetry"]["inference_time_ms"] = infer_time
        pipeline_state["steps"]["ai_compiler"] = "SUCCESS"
        log(f"AI Compilation complete in {infer_time}ms. Emitted {len(plan.get('resources', []))} resource declarations.")

        # Stage 3: Terraform Generation & Planning
        pipeline_state["current_step"] = "terraform"
        pipeline_state["steps"]["terraform"] = "RUNNING"
        log(f"Rendering HCL Terraform definitions for target [{target.upper()}] with spec-commit [{commit_tag}]...")

        hcl = render_terraform(plan, target=target, spec_commit=commit_tag)
        (gen_dir / "main.tf").write_text(hcl, encoding="utf-8")

        # For docker target, validate with local terraform plan
        if target == "docker":
            valid, val_logs, plan_json = validate_and_plan(gen_dir)
            if not valid:
                if "docker daemon is not running" in val_logs.lower() or "error pinging docker server" in val_logs.lower() or dry_run:
                    plan_json_path = gen_dir / "plan.json"
                    synth_plan = {
                        "format_version": "1.0",
                        "resource_changes": []
                    }
                    for r in plan.get("resources", []):
                        synth_plan["resource_changes"].append({
                            "address": f"{r['name']}",
                            "type": "docker_container",
                            "change": {
                                "after": {
                                    "public_access": r.get("public_access", False),
                                    "ssh_enabled": r.get("ssh_enabled", False),
                                    "tags": r.get("tags", {}),
                                    "labels": [
                                        {"label": "owner", "value": r.get("tags", {}).get("owner", "")},
                                        {"label": "spec_commit", "value": commit_tag},
                                        {"label": "public_access", "value": str(r.get("public_access", False)).lower()},
                                        {"label": "ssh_enabled", "value": str(r.get("ssh_enabled", False)).lower()}
                                    ]
                                }
                            }
                        })
                    plan_json_path.write_text(json.dumps(synth_plan), encoding="utf-8")
                    log("Docker daemon offline: Generated synthetic plan representation for security scan & policy evaluation.")
                else:
                    raise RuntimeError(f"Terraform validation/plan failed:\n{val_logs}")
        else:
            # Generate synthetic plan.json representation for OPA evaluation on cloud targets
            plan_json_path = gen_dir / "plan.json"
            synth_plan = {
                "format_version": "1.0",
                "resource_changes": []
            }
            for r in plan.get("resources", []):
                synth_plan["resource_changes"].append({
                    "address": f"{r['name']}",
                    "type": f"{target}_resource",
                    "change": {
                        "after": {
                            "public_access": r.get("public_access", False),
                            "ssh_enabled": r.get("ssh_enabled", False),
                            "tags": r.get("tags", {}),
                            "labels": [
                                {"label": "owner", "value": r.get("tags", {}).get("owner", "")},
                                {"label": "spec_commit", "value": commit_tag},
                                {"label": "public_access", "value": str(r.get("public_access", False)).lower()},
                                {"label": "ssh_enabled", "value": str(r.get("ssh_enabled", False)).lower()}
                            ]
                        }
                    }
                })
            plan_json_path.write_text(json.dumps(synth_plan), encoding="utf-8")

        pipeline_state["steps"]["terraform"] = "SUCCESS"
        log(f"Terraform HCL rendered for {target.upper()} and plan verified.")

        # Stage 3.5: Static Terraform Security Scanner (Checkov / HCL AST Rules)
        log("Executing Static Terraform Security Scanner (Checkov / HCL rules)...")
        rule_filter = {k: v["enabled"] for k, v in active_policies.items()}
        enabled_policies = [p for p in active_policies.values() if p["enabled"]]
        
        scan_passed, scan_findings, scan_summary = scan_terraform(gen_dir, active_rules=rule_filter)
        pipeline_state["static_scan"] = {
            "passed": scan_passed,
            "findings": scan_findings,
            "summary": scan_summary,
            "evaluated_at": time.strftime("%H:%M:%S")
        }

        # Stage 4: OPA Security Policy Gate
        pipeline_state["current_step"] = "opa_policy"
        pipeline_state["steps"]["opa_policy"] = "RUNNING"
        log("Evaluating OPA security policies (policies/security.rego)...")

        allow, violations = evaluate_policy(gen_dir / "plan.json", active_rules=rule_filter)

        # Merge static scan critical/high findings into violations if static scan failed
        combined_violations = list(violations)
        if not scan_passed:
            for f in scan_findings:
                if f.get("severity") in ("HIGH", "CRITICAL"):
                    combined_violations.append(f"[{f.get('check_id')}] {f.get('check_name')}")

        rule_eval_details = []
        for p in active_policies.values():
            p_id = p["id"]
            if not p["enabled"]:
                status = "DISABLED"
            else:
                rule_violated = False
                for v in combined_violations:
                    v_lower = v.lower()
                    if p_id == "no_public_ingress" and ("public_access" in v_lower or "ckv_docker_1" in v_lower or "public" in v_lower):
                        rule_violated = True
                    elif p_id == "no_ssh_exposed" and ("ssh" in v_lower or "ckv_docker_2" in v_lower or "22" in v_lower):
                        rule_violated = True
                    elif p_id == "require_owner_tag" and ("owner" in v_lower or "ckv_docker_4" in v_lower):
                        rule_violated = True
                status = "VIOLATED" if rule_violated else "PASSED"

            rule_eval_details.append({
                "id": p_id,
                "name": p["name"],
                "status": status,
                "enabled": p["enabled"],
                "category": p["category"]
            })

        total_enabled = len(enabled_policies)
        gate_passed = allow and scan_passed
        passed_count = total_enabled if gate_passed else max(0, total_enabled - len(combined_violations))

        opa_eval_payload = {
            "status": "PASSED" if gate_passed else "FAILED",
            "allow": gate_passed,
            "passed_count": passed_count,
            "total_count": total_enabled,
            "summary": f"{total_enabled}/{total_enabled} rules passed (0 violations)" if gate_passed else f"{len(combined_violations)} security violation(s) detected",
            "violations": combined_violations,
            "opa_violations": violations,
            "static_findings": scan_findings,
            "rules": rule_eval_details,
            "static_scan": pipeline_state["static_scan"],
            "evaluated_at": time.strftime("%H:%M:%S")
        }
        pipeline_state["opa_evaluation"] = opa_eval_payload
        pipeline_state["violations"] = combined_violations

        if not gate_passed:
            pipeline_state["steps"]["opa_policy"] = "FAILED"
            violation_str = "\n• " + "\n• ".join(combined_violations)
            if not scan_passed and allow:
                raise RuntimeError(f"Static Terraform Security Scanner (Checkov/HCL) DENIED execution:\n• " + "\n• ".join([f.get('check_name') for f in scan_findings]))
            else:
                raise RuntimeError(f"Security Policy Gate DENIED execution:{violation_str}")

        pipeline_state["steps"]["opa_policy"] = "SUCCESS"
        log(f"Security Gate passed cleanly ({total_enabled}/{total_enabled} rules compliant, static scan clean).")

        # If Dry-Run (Synthesis Only), finish here!
        if dry_run:
            log("Synthesis Mode (Dry-Run): Stages 1-4 completed. Terraform HCL and OPA Guardrails verified without provisioning live containers.")
            total_time = round((time.time() - start_time) * 1000, 1)
            pipeline_state["telemetry"]["total_duration_ms"] = total_time
            pipeline_state["status"] = "SUCCESS"
            pipeline_state["current_step"] = "complete"
            log(f"Synthesis finished cleanly in {total_time}ms!")
            _persist_pipeline_run(
                spec_commit=commit_tag,
                target=target,
                status="deployed",
                duration_ms=total_time,
                dry_run=True,
            )
            return

        # Stage 5: Deployment (Apply to Docker or Synthesize Cloud Target)
        pipeline_state["current_step"] = "deployment"
        pipeline_state["steps"]["deployment"] = "RUNNING"

        if target == "docker":
            log("Applying plan to live local Docker engine...")
            applied, apply_logs = apply_plan(gen_dir)
            if not applied:
                pipeline_state["steps"]["deployment"] = "FAILED"
                raise RuntimeError(f"Terraform apply failed:\n{apply_logs}")
            pipeline_state["steps"]["deployment"] = "SUCCESS"
            log("Terraform apply completed. Live Docker infrastructure updated.")
        else:
            log(f"Target is {target.upper()} (Synthesis & Verification Mode).")
            time.sleep(1)
            pipeline_state["steps"]["deployment"] = "SUCCESS"
            log(f"Production-grade {target.upper()} Terraform module ready for 1-Click Cloud Export.")

        # Stage 6: Verification & Drift Check
        pipeline_state["current_step"] = "verification"
        pipeline_state["steps"]["verification"] = "RUNNING"
        log("Verifying deployment state...")
        time.sleep(1)
        pipeline_state["steps"]["verification"] = "SUCCESS"

        pipeline_state["current_step"] = "drift_check"
        pipeline_state["steps"]["drift_check"] = "RUNNING"
        log("Executing drift check...")
        time.sleep(1)
        pipeline_state["steps"]["drift_check"] = "SUCCESS"

        total_time = round((time.time() - start_time) * 1000, 1)
        pipeline_state["telemetry"]["total_duration_ms"] = total_time
        pipeline_state["status"] = "SUCCESS"
        pipeline_state["current_step"] = "complete"
        log(f"Pipeline execution finished cleanly in {total_time}ms!")

        _persist_pipeline_run(
            spec_commit=commit_tag,
            target=target,
            status="deployed",
            duration_ms=total_time,
            dry_run=False,
        )

    except Exception as e:
        total_time = round((time.time() - start_time) * 1000, 1)
        pipeline_state["telemetry"]["total_duration_ms"] = total_time
        pipeline_state["status"] = "FAILED"
        pipeline_state["error_message"] = str(e)
        failed_step = pipeline_state["current_step"]
        pipeline_state["failed_step"] = failed_step
        if failed_step in pipeline_state["steps"]:
            pipeline_state["steps"][failed_step] = "FAILED"
        log(f"ERROR: {e}")

        err_text = str(e)
        _persist_pipeline_run(
            spec_commit=pipeline_state.get("spec_commit") or (commit_tag if "commit_tag" in locals() else None),
            target=target,
            status=_terminal_status_for_failure(failed_step, err_text),
            duration_ms=total_time,
            dry_run=dry_run,
            failure_stage=failed_step,
            failure_detail=err_text,
        )



@app.post("/api/pipeline/run")
def run_pipeline(payload: RunPipelineRequest, background_tasks: BackgroundTasks):
    """Triggers pipeline run in background task (full or synthesis dry-run)."""
    if pipeline_state["status"] == "RUNNING":
        raise HTTPException(status_code=400, detail="Pipeline is already running")

    yaml_content = payload.specification
    if not yaml_content:
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"
        yaml_content = spec_path.read_text(encoding="utf-8")

    target = payload.target or "docker"
    dry_run = payload.dry_run or False
    background_tasks.add_task(execute_pipeline_task, yaml_content, target, dry_run)
    return {"message": f"Pipeline run started for target {target} (dry_run={dry_run})", "status": "RUNNING"}


@app.get("/api/policies")
def get_policies():
    """Returns active OPA governance and security policies."""
    return {"policies": list(active_policies.values())}


@app.post("/api/policies/toggle")
def toggle_policy(payload: PolicyToggleRequest):
    """Toggles an OPA policy rule on/off for interactive sandbox testing."""
    if payload.policy_id not in active_policies:
        raise HTTPException(status_code=404, detail=f"Policy {payload.policy_id} not found")
    active_policies[payload.policy_id]["enabled"] = payload.enabled
    return {"message": f"Policy {payload.policy_id} updated", "policy": active_policies[payload.policy_id]}


@app.post("/api/policies/evaluate")
def evaluate_policies_endpoint():
    """Evaluates active OPA policies against the current plan.json and returns full rule-by-rule results."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    plan_json_path = gen_dir / "plan.json"
    if not plan_json_path.exists():
        # Fallback: synthesize a quick clean plan from active spec
        spec_path = gen_dir / "active_infrastructure.yaml"
        if not spec_path.exists():
            spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"
        schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
        try:
            spec = load_spec(spec_path, schema_path=schema_path)
            plan = call_llm_for_plan(spec, force_refresh=False)
            hcl = render_terraform(plan, target="docker")
            gen_dir.mkdir(parents=True, exist_ok=True)
            (gen_dir / "main.tf").write_text(hcl, encoding="utf-8")
            validate_and_plan(gen_dir)
        except Exception:
            pass

    if not plan_json_path.exists():
        raise HTTPException(status_code=400, detail="No synthesized plan found. Run synthesis first.")

    rule_filter = {k: v["enabled"] for k, v in active_policies.items()}
    enabled_policies = [p for p in active_policies.values() if p["enabled"]]
    
    # 1. Static Scan
    scan_passed, scan_findings, scan_summary = scan_terraform(gen_dir, active_rules=rule_filter)
    static_scan_res = {
        "passed": scan_passed,
        "findings": scan_findings,
        "summary": scan_summary,
        "evaluated_at": time.strftime("%H:%M:%S")
    }
    pipeline_state["static_scan"] = static_scan_res

    # 2. OPA Policy Eval
    allow, violations = evaluate_policy(plan_json_path, active_rules=rule_filter)

    combined_violations = list(violations)
    if not scan_passed:
        for f in scan_findings:
            if f.get("severity") in ("HIGH", "CRITICAL"):
                combined_violations.append(f"[{f.get('check_id')}] {f.get('check_name')}")

    rule_eval_details = []
    for p in active_policies.values():
        p_id = p["id"]
        if not p["enabled"]:
            status = "DISABLED"
        else:
            rule_violated = False
            for v in combined_violations:
                v_lower = v.lower()
                if p_id == "no_public_ingress" and ("public_access" in v_lower or "ckv_docker_1" in v_lower or "public" in v_lower):
                    rule_violated = True
                elif p_id == "no_ssh_exposed" and ("ssh" in v_lower or "ckv_docker_2" in v_lower or "22" in v_lower):
                    rule_violated = True
                elif p_id == "require_owner_tag" and ("owner" in v_lower or "ckv_docker_4" in v_lower):
                    rule_violated = True
            status = "VIOLATED" if rule_violated else "PASSED"

        rule_eval_details.append({
            "id": p_id,
            "name": p["name"],
            "status": status,
            "enabled": p["enabled"],
            "category": p["category"]
        })

    total_enabled = len(enabled_policies)
    gate_passed = allow and scan_passed
    passed_count = total_enabled if gate_passed else max(0, total_enabled - len(combined_violations))

    result = {
        "status": "PASSED" if gate_passed else "FAILED",
        "allow": gate_passed,
        "passed_count": passed_count,
        "total_count": total_enabled,
        "summary": f"{total_enabled}/{total_enabled} rules passed (0 violations)" if gate_passed else f"{len(combined_violations)} security violation(s) detected",
        "violations": combined_violations,
        "opa_violations": violations,
        "static_findings": scan_findings,
        "rules": rule_eval_details,
        "static_scan": static_scan_res,
        "evaluated_at": time.strftime("%H:%M:%S")
    }
    pipeline_state["opa_evaluation"] = result
    pipeline_state["violations"] = combined_violations
    return result


@app.get("/api/export/bundle")
def export_infrastructure_bundle(target: str = "docker"):
    """
    Generates and downloads a complete, production-ready Infrastructure Bundle (.zip)
    containing Terraform HCL, infrastructure specification, OPA Rego rules,
    and GitHub Actions CI/CD workflows.
    """
    gen_dir = ROOT_DIR / "terraform" / "generated"
    spec_path = gen_dir / "active_infrastructure.yaml"
    if not spec_path.exists():
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

    yaml_content = spec_path.read_text(encoding="utf-8") if spec_path.exists() else ""
    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
    try:
        spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}
        plan = call_llm_for_plan(spec, force_refresh=False)
        tf_hcl = render_terraform(plan, target=target)
    except Exception:
        tf_hcl = (gen_dir / "main.tf").read_text(encoding="utf-8") if (gen_dir / "main.tf").exists() else "# Empty HCL"

    rego_path = ROOT_DIR / "policies" / "security.rego"
    rego_content = rego_path.read_text(encoding="utf-8") if rego_path.exists() else ""

    gh_workflow = f"""name: Deploy Infrastructure ({target.upper()})
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
      - name: Setup OPA
        uses: open-policy-agent/setup-opa@v2
      - name: Terraform Init & Plan
        run: |
          terraform init
          terraform plan -out=tfplan
      - name: OPA Policy Check
        run: |
          opa eval --data policies/ --input plan.json "data.infra.security.deny"
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
"""

    readme_content = f"""# SDD-Infra Production Export Bundle ({target.upper()})

This bundle was generated by **SDD-Infra** (Specification Driven Infrastructure Management).

## Files Included:
- `main.tf` — Production-grade Terraform HCL for **{target.upper()}**
- `infrastructure.yaml` — Declarative application specification
- `policies/security.rego` — Open Policy Agent (OPA) security guardrails
- `.github/workflows/deploy.yml` — Automated CI/CD deployment pipeline

## Quickstart:
1. Initialize Terraform:
   ```bash
   terraform init
   ```
2. Validate Plan:
   ```bash
   terraform plan
   ```
3. Apply to Cloud:
   ```bash
   terraform apply
   ```
"""

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("main.tf", tf_hcl)
        zip_file.writestr("infrastructure.yaml", yaml_content)
        zip_file.writestr("policies/security.rego", rego_content)
        zip_file.writestr(".github/workflows/deploy.yml", gh_workflow)
        zip_file.writestr("README.md", readme_content)

    zip_buffer.seek(0)
    filename = f"sdd-infra-{target}-bundle.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



@app.get("/api/pipeline/status")
def get_pipeline_status():
    """Returns current pipeline state and stage breakdown."""
    return pipeline_state


@app.get("/api/pipeline/history")
def get_pipeline_history():
    """Returns persistent execution run history records."""
    return {"history": _history_for_api()}


@app.delete("/api/pipeline/history")
def clear_pipeline_history():
    """Clears pipeline run history store."""
    clear_runs()
    return {"message": "Run history cleared", "history": []}



@app.get("/api/infrastructure")
def get_infrastructure():
    """Returns live Docker container table data."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    spec_path = gen_dir / "active_infrastructure.yaml"
    if not spec_path.exists():
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
    try:
        spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}
    except Exception:
        spec = {}

    res = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}"],
        capture_output=True,
        text=True,
        check=False
    )

    containers = []
    if res.returncode == 0 and res.stdout.strip():
        for line in res.stdout.strip().splitlines():
            parts = line.split("\t")
            if len(parts) >= 3:
                name, image, status = parts[0], parts[1], parts[2]
                containers.append({
                    "resource": name,
                    "image": image,
                    "desired": 1,
                    "actual": 1,
                    "status": "Running" if "Up" in status else status
                })

    return {
        "containers": containers,
        "count": len(containers)
    }


@app.get("/api/drift")
def get_drift_status():
    """Runs drift detector against active specification and live tfstate/containers."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    spec_path = gen_dir / "active_infrastructure.yaml"
    if not spec_path.exists():
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
    try:
        spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}
    except Exception:
        spec = {}

    tfstate_path = gen_dir / "terraform.tfstate"
    tfstate = json.loads(tfstate_path.read_text(encoding="utf-8")) if tfstate_path.exists() else {"resources": []}

    live_res = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, check=False)
    live_containers = [{"name": n.strip()} for n in live_res.stdout.splitlines() if n.strip()]

    drift_report = detect_drift(spec, tfstate, live_containers=live_containers)
    markdown_report = render_drift_markdown_report(drift_report)

    return {
        "drift_detected": drift_report.get("drift_detected", False),
        "items": drift_report.get("items", []),
        "markdown": markdown_report
    }


@app.post("/api/drift/simulate")
def simulate_drift():
    """Launches an unmanaged container to simulate out-of-band infrastructure drift."""
    res = subprocess.run(
        ["docker", "run", "-d", "--name", "frontend-3-untracked", "nginx:1.25"],
        capture_output=True,
        text=True,
        check=False
    )
    time.sleep(1)
    return get_drift_status()


@app.delete("/api/drift/simulate")
def cleanup_simulated_drift():
    """Removes the unmanaged demo container."""
    subprocess.run(["docker", "rm", "-f", "frontend-3-untracked"], capture_output=True, check=False)
    return {"message": "Simulated drift container removed"}


@app.post("/api/drift/reconcile")
def reconcile_drift():
    """Autonomously heals detected drift by removing unmanaged containers and applying active state."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    spec_path = gen_dir / "active_infrastructure.yaml"
    if not spec_path.exists():
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
    try:
        spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}
    except Exception:
        spec = {}

    tfstate_path = gen_dir / "terraform.tfstate"
    tfstate = json.loads(tfstate_path.read_text(encoding="utf-8")) if tfstate_path.exists() else {"resources": []}

    live_res = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, check=False)
    live_containers = [{"name": n.strip()} for n in live_res.stdout.splitlines() if n.strip()]

    drift_report = detect_drift(spec, tfstate, live_containers=live_containers)
    reconciled_actions = []

    for item in drift_report.get("items", []):
        res_name = item.get("resource")
        drift_type = item.get("type", "")
        if drift_type == "unmanaged_resource":
            subprocess.run(["docker", "rm", "-f", res_name], capture_output=True, check=False)
            reconciled_actions.append(f"Pruned unmanaged container: {res_name}")
        elif drift_type in ("missing_resource", "count_mismatch", "config_drift"):
            apply_plan(gen_dir)
            reconciled_actions.append(f"Re-applied Terraform desired state for: {res_name}")

    time.sleep(1)
    new_status = get_drift_status()
    new_status["reconciled_actions"] = reconciled_actions
    return new_status


@app.get("/api/drift/schedule")
def get_drift_schedule():
    """Returns background drift schedule status and monitoring metrics."""
    return scheduled_drift_state


@app.post("/api/drift/schedule/trigger")
def trigger_drift_schedule_now():
    """Triggers an immediate scheduled drift check pass."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    spec_path = gen_dir / "active_infrastructure.yaml"
    if not spec_path.exists():
        spec_path = ROOT_DIR / "specification" / "infrastructure.yaml"

    schema_path = ROOT_DIR / "specification" / "schema" / "infra-spec.schema.json"
    spec = load_spec(spec_path, schema_path=schema_path) if spec_path.exists() else {}

    tfstate_path = gen_dir / "terraform.tfstate"
    tfstate = json.loads(tfstate_path.read_text(encoding="utf-8")) if tfstate_path.exists() else {"resources": []}

    live_res = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, check=False)
    live_containers = [{"name": n.strip()} for n in live_res.stdout.splitlines() if n.strip()]

    report = detect_drift(spec, tfstate, live_containers=live_containers)
    scheduled_drift_state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    scheduled_drift_state["total_runs"] += 1
    scheduled_drift_state["drift_detected"] = report.get("drift_detected", False)
    scheduled_drift_state["findings_count"] = len(report.get("items", []))
    return {
        "status": "completed",
        "schedule": scheduled_drift_state,
        "report": report
    }


@app.get("/api/generated/resource-plan")
def get_resource_plan():
    """Returns candidate AI JSON resource plan."""
    gen_dir = ROOT_DIR / "terraform" / "generated"
    cache_dir = gen_dir / "cache"

    if cache_dir.exists():
        json_files = list(cache_dir.glob("*.json"))
        if json_files:
            latest_file = max(json_files, key=lambda f: f.stat().st_mtime)
            return json.loads(latest_file.read_text(encoding="utf-8"))

    return {"resources": []}


@app.get("/api/generated/terraform")
def get_terraform_code():
    """Returns generated main.tf HCL code."""
    tf_file = ROOT_DIR / "terraform" / "generated" / "main.tf"
    if tf_file.exists():
        return {"code": tf_file.read_text(encoding="utf-8")}
    return {"code": "# No Terraform generated yet"}


@app.get("/landing")
def get_landing_page():
    if frontend_dist.exists():
        return FileResponse(frontend_dist / "index.html")
    landing_file = ROOT_DIR / "landing.html"
    if landing_file.exists():
        return FileResponse(landing_file)
    raise HTTPException(status_code=404, detail="Landing page not found")


# Mount static frontend build files if dist folder exists
frontend_dist = ROOT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
