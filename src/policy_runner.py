import json
import subprocess
from pathlib import Path
from typing import List, Tuple, Optional, Dict


class PolicyGateError(Exception):
    """Raised when policy evaluation fails or denies execution."""
    pass


def find_opa_binary() -> str:
    user_bin = Path("C:/Users/dwive/bin/opa.exe")
    if user_bin.exists():
        return str(user_bin)
    return "opa"


def evaluate_policy(
    plan_json_path: str | Path,
    policies_dir: str | Path = None,
    opa_binary: Optional[str] = None,
    active_rules: Optional[Dict[str, bool]] = None
) -> Tuple[bool, List[str]]:
    """
    Evaluates OPA Rego security policy against terraform plan.json payload.
    Supports dynamic active_rules toggling for interactive policy customization.
    Returns (allow, violations_list).
    """
    plan_json_path = Path(plan_json_path)
    if not plan_json_path.exists():
        raise FileNotFoundError(f"Plan JSON not found at {plan_json_path}")

    if policies_dir is None:
        policies_dir = Path(__file__).parent.parent / "policies"
    else:
        policies_dir = Path(policies_dir)

    binary = opa_binary or find_opa_binary()

    cmd = [
        binary,
        "eval",
        "--data", str(policies_dir),
        "--input", str(plan_json_path),
        "data.infra.security.deny",
        "--format", "json"
    ]

    res = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=False
    )

    if res.returncode != 0:
        raise PolicyGateError(f"OPA eval failed: {res.stderr.strip()}")

    try:
        output_data = json.loads(res.stdout)
        results = output_data.get("result", [])
        violations = []
        if results and "expressions" in results[0]:
            for expr in results[0]["expressions"]:
                val = expr.get("value")
                if isinstance(val, list):
                    violations.extend(val)
                elif isinstance(val, str) and val:
                    violations.append(val)

        # Apply active_rules filter if customized
        if active_rules:
            filtered_violations = []
            for v in violations:
                v_lower = v.lower()
                if "public_access" in v_lower and not active_rules.get("no_public_ingress", True):
                    continue
                if "ssh" in v_lower and not active_rules.get("no_ssh_exposed", True):
                    continue
                if "owner" in v_lower and not active_rules.get("require_owner_tag", True):
                    continue
                filtered_violations.append(v)
            violations = filtered_violations

        allow = len(violations) == 0
        return allow, violations
    except json.JSONDecodeError as e:
        raise PolicyGateError(f"Failed to parse OPA JSON output: {e}\nRaw output: {res.stdout}")
