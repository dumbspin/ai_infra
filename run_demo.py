import os
import sys
import json
import subprocess
import time
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent))

from src.loader import load_spec
from src.compiler.llm_client import call_llm_for_plan
from src.compiler.renderer import render_terraform
from src.validator import validate_and_plan
from src.policy_runner import evaluate_policy
from src.applier import apply_plan, check_idempotency
from src.drift.detector import detect_drift, render_drift_markdown_report


def run_pipeline():
    print("=" * 60)
    print("SDD-Infra v2.0 Live Pipeline Execution")
    print("=" * 60)

    # 1. Load & Schema-Validate Spec
    print("\n[Step 1] Loading specification...")
    spec = load_spec("specification/infrastructure.yaml")
    print(f"  -> Validated spec: App='{spec['application']}', Env='{spec['environment']}'")

    # 2. Compile Resource Plan via LLM client
    print("\n[Step 2] Translating spec into candidate JSON Resource Plan...")
    plan = call_llm_for_plan(spec, force_refresh=True)
    print(f"  -> Emitted resource plan with {len(plan['resources'])} resource declarations")

    # 3. Render Terraform HCL
    print("\n[Step 3] Rendering pure Terraform HCL with replica expansion...")
    hcl = render_terraform(plan)
    gen_dir = Path("terraform/generated")
    gen_dir.mkdir(parents=True, exist_ok=True)
    (gen_dir / "main.tf").write_text(hcl, encoding="utf-8")
    print(f"  -> Wrote candidate Terraform code to {gen_dir / 'main.tf'}")

    # 4. Terraform Init, Validate & Plan
    print("\n[Step 4] Running terraform init, validate, and plan...")
    valid, val_logs, plan_json = validate_and_plan(gen_dir)
    if not valid:
        print("[FAIL] Terraform Validation Error:")
        print(val_logs)
        return
    print("  -> Terraform syntax & plan check PASSED")

    # 5. OPA Policy Gate Evaluation
    print("\n[Step 5] Evaluating security policies (OPA)...")
    allow, violations = evaluate_policy(gen_dir / "plan.json")
    if not allow:
        print("[FAIL] Policy Gate DENIED execution:")
        for v in violations:
            print(f"  - {v}")
        return
    print("  -> OPA Security Gate PASSED (0 policy violations)")

    # 6. Apply to Live Docker Infrastructure
    print("\n[Step 6] Applying infrastructure plan to local Docker...")
    applied, apply_logs = apply_plan(gen_dir)
    if not applied:
        print("[FAIL] Terraform Apply Failed:")
        print(apply_logs)
        return
    print("  -> Terraform Apply PASSED! Infrastructure updated successfully.")

    # 7. Check Running Containers
    print("\n[Step 7] Inspecting running Docker containers...")
    res = subprocess.run(["docker", "ps", "--format", "table {{.Names}}\t{{.Image}}\t{{.Status}}"], capture_output=True, text=True)
    print(res.stdout.strip())

    # 8. Idempotency Proof
    print("\n[Step 8] Verifying Idempotency (re-running plan on unchanged spec)...")
    is_idempotent, returncode, plan_out = check_idempotency(gen_dir)
    if is_idempotent:
        print("  -> IDEMPOTENCY PROOF PASSED: Plan reports 0 changes needed (converged state).")
    else:
        print(f"  -> Plan exit code: {returncode}")

    # 9. Out-of-Band Drift Test Simulation
    print("\n[Step 9] Simulating manual out-of-band container drift...")
    print("  Starting manual untracked container 'frontend-3-untracked'...")
    subprocess.run(["docker", "run", "-d", "--name", "frontend-3-untracked", "nginx:1.25"], capture_output=True)

    time.sleep(1)

    # 10. Run Drift Detection
    print("\n[Step 10] Running Drift Detection Engine...")
    tfstate_path = gen_dir / "terraform.tfstate"
    tfstate = json.loads(tfstate_path.read_text(encoding="utf-8")) if tfstate_path.exists() else {}

    # Get live containers list from docker
    live_res = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    live_names = [{"name": n.strip()} for n in live_res.stdout.splitlines() if n.strip()]

    drift_report = detect_drift(spec, tfstate, live_containers=live_names)
    markdown = render_drift_markdown_report(drift_report)
    print("\n" + markdown)

    # Clean up manual untracked container
    print("Cleaning up manual untracked container...")
    subprocess.run(["docker", "rm", "-f", "frontend-3-untracked"], capture_output=True)
    print("  -> Cleanup complete.")

    print("\n=" * 60)
    print("Live SDD-Infra Demo Execution Complete!")
    print("=" * 60)


if __name__ == "__main__":
    run_pipeline()
