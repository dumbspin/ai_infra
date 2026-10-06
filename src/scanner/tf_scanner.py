import sys
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class StaticScanError(Exception):
    """Raised when static scanner finds critical security violations in Terraform HCL."""
    pass


def scan_terraform(
    tf_dir: Path | str,
    plan_json_path: Optional[Path | str] = None,
    fail_on_severity: str = "HIGH",
    active_rules: Optional[Dict[str, bool]] = None
) -> Tuple[bool, List[Dict[str, Any]], str]:
    """
    Runs static analysis (Checkov/tfsec and native HCL rules) against Terraform definitions.
    Accepts active_rules dict to honor user-customized policy sandbox toggles.
    Returns (passed: bool, findings: List[Dict], summary: str).
    """
    tf_dir = Path(tf_dir)
    findings: List[Dict[str, Any]] = []
    engine = "native"

    main_tf = tf_dir / "main.tf"
    tf_content = main_tf.read_text(encoding="utf-8") if main_tf.exists() else ""

    allow_public_ingress_check = active_rules is None or active_rules.get("no_public_ingress", True)
    allow_ssh_check = active_rules is None or active_rules.get("no_ssh_exposed", True)
    allow_owner_check = active_rules is None or active_rules.get("require_owner_tag", True)

    # 1. Native HCL & Plan.json Security Rules
    if tf_content:
        # Check 1: Wildcard / Public Ingress
        if allow_public_ingress_check:
            has_public_access = (
                bool(re.search(r'public_access\s*=\s*["\']?true["\']?', tf_content, re.IGNORECASE)) or
                bool(re.search(r'label\s*=\s*["\']public_access["\']\s+value\s*=\s*["\']true["\']', tf_content, re.IGNORECASE)) or
                bool(re.search(r'ingress\s*\{[^}]*cidr_blocks\s*=\s*\[["\']0\.0\.0\.0/0["\']\]', tf_content, re.DOTALL))
            )
            if has_public_access:
                findings.append({
                    "check_id": "CKV_DOCKER_1",
                    "check_name": "Ensure container/service is not exposed to public ingress (0.0.0.0/0)",
                    "resource": "docker_container",
                    "severity": "HIGH",
                    "file": "main.tf",
                    "details": "Resource enables unrestricted public ingress in violation of Zero-Trust perimeter baseline."
                })

        # Check 2: Direct SSH Access (Port 22)
        if allow_ssh_check:
            has_ssh = (
                bool(re.search(r'ssh_enabled\s*=\s*["\']?true["\']?', tf_content, re.IGNORECASE)) or
                bool(re.search(r'label\s*=\s*["\']ssh_enabled["\']\s+value\s*=\s*["\']true["\']', tf_content, re.IGNORECASE)) or
                bool(re.search(r'ingress\s*\{[^}]*from_port\s*=\s*22\b', tf_content, re.DOTALL)) or
                bool(re.search(r'internal\s*=\s*22\b', tf_content))
            )
            if has_ssh:
                findings.append({
                    "check_id": "CKV_DOCKER_2",
                    "check_name": "Ensure SSH service (Port 22) is not exposed on workload containers",
                    "resource": "docker_container",
                    "severity": "CRITICAL",
                    "file": "main.tf",
                    "details": "Resource allows direct SSH access in violation of Zero-Trust container baseline."
                })

        # Check 3: Privileged Container Execution (Baseline)
        if re.search(r'privileged\s*=\s*true', tf_content, re.IGNORECASE):
            findings.append({
                "check_id": "CKV_DOCKER_3",
                "check_name": "Do not run containers in privileged mode",
                "resource": "docker_container",
                "severity": "CRITICAL",
                "file": "main.tf",
                "details": "Privileged mode allows container breakouts and host privilege escalation."
            })

        # Check 4: Missing Governance Tags / Owner Label
        if allow_owner_check and "resource \"docker_container\"" in tf_content:
            has_owner = bool(re.search(r'label\s*=\s*["\']owner["\']\s+value\s*=\s*["\'][a-zA-Z0-9_\-\.]+["\']', tf_content)) or bool(re.search(r'owner\s*=\s*["\'][a-zA-Z0-9_\-\.]+["\']', tf_content))
            if not has_owner:
                findings.append({
                    "check_id": "CKV_DOCKER_4",
                    "check_name": "Ensure all resources have mandatory 'owner' governance metadata",
                    "resource": "docker_container",
                    "severity": "MEDIUM",
                    "file": "main.tf",
                    "details": "Resource missing owner tag required for cost allocation and governance."
                })

    # 2. Checkov CLI execution if available
    try:
        res = subprocess.run(
            [
                sys.executable,
                "-m", "checkov",
                "-d", str(tf_dir),
                "--framework", "terraform",
                "--output", "json",
                "--soft-fail",
                "--quiet"
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        if res.returncode == 0 and res.stdout.strip():
            engine = "checkov"
            try:
                checkov_data = json.loads(res.stdout)
                results = checkov_data.get("results", {}) if isinstance(checkov_data, dict) else {}
                failed_checks = results.get("failed_checks", [])
                for fc in failed_checks:
                    cid = fc.get("check_id", "CKV_CUSTOM")
                    cname = fc.get("check_name", "Security Check")
                    cname_lower = cname.lower()
                    
                    # Filter based on active_rules
                    if not allow_public_ingress_check and ("public" in cname_lower or "ingress" in cname_lower or cid == "CKV_DOCKER_1"):
                        continue
                    if not allow_ssh_check and ("ssh" in cname_lower or "22" in cname_lower or cid == "CKV_DOCKER_2"):
                        continue
                    if not allow_owner_check and ("owner" in cname_lower or "tag" in cname_lower or cid == "CKV_DOCKER_4"):
                        continue

                    findings.append({
                        "check_id": cid,
                        "check_name": cname,
                        "resource": fc.get("resource", "terraform_resource"),
                        "severity": fc.get("severity", "HIGH"),
                        "file": fc.get("file_path", "main.tf"),
                        "details": fc.get("guideline", "Checkov security policy finding")
                    })
            except Exception:
                pass
    except Exception:
        pass

    # Deduplicate findings by check_id
    unique_findings = []
    seen = set()
    for f in findings:
        key = (f.get("check_id"), f.get("resource"))
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)

    # Determine if scan passes based on severity threshold
    high_critical_count = sum(1 for f in unique_findings if f.get("severity") in ("HIGH", "CRITICAL"))
    passed = (high_critical_count == 0)

    if passed:
        summary = f"Static Security Scan ({engine.upper()}) passed cleanly with 0 high/critical findings."
    else:
        summary = f"Static Security Scan ({engine.upper()}) failed: {high_critical_count} critical/high security findings detected."

    return passed, unique_findings, summary
