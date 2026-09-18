import subprocess
from pathlib import Path
from typing import Tuple, Optional
from src.validator import find_terraform_binary


class TerraformApplyError(Exception):
    """Raised when terraform apply fails or results in partial application."""
    pass


def apply_plan(
    generated_dir: str | Path,
    plan_filename: str = "tfplan",
    terraform_binary: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Executes terraform apply tfplan with strict exit status and partial-failure handling.
    """
    generated_dir = Path(generated_dir)
    plan_file = generated_dir / plan_filename
    if not plan_file.exists():
        raise FileNotFoundError(f"Plan file not found at {plan_file}")

    binary = terraform_binary or find_terraform_binary()

    cmd = [binary, "apply", "-input=false", "-no-color", str(plan_file)]
    res = subprocess.run(
        cmd,
        cwd=generated_dir,
        capture_output=True,
        text=True,
        check=False
    )

    output = (res.stdout + "\n" + res.stderr).strip()

    if res.returncode != 0:
        # Check for partial apply indicators
        if "Apply complete!" in output or "Error:" in output:
            warning = "[WARNING] Partial apply detected or apply failure. State preserved for safety. Automatic rollback disabled in v1."
            output = f"{output}\n{warning}"
        return False, output

    return True, output


def check_idempotency(
    generated_dir: str | Path,
    terraform_binary: Optional[str] = None
) -> Tuple[bool, int, str]:
    """
    Runs terraform plan -detailed-exitcode.
    Exit codes:
    0 = Succeeded, diff is empty (0 changes - converged)
    1 = Errored
    2 = Succeeded, there is a diff (changes present)
    """
    generated_dir = Path(generated_dir)
    binary = terraform_binary or find_terraform_binary()

    cmd = [binary, "plan", "-detailed-exitcode", "-no-color"]
    res = subprocess.run(
        cmd,
        cwd=generated_dir,
        capture_output=True,
        text=True,
        check=False
    )

    output = (res.stdout + "\n" + res.stderr).strip()
    is_idempotent = (res.returncode == 0)
    return is_idempotent, res.returncode, output
