import subprocess
from pathlib import Path
from typing import Tuple, Optional
from src.validator import find_terraform_binary


DAEMON_UNAVAILABLE_MESSAGE = (
    "No Docker daemon reachable in this environment. This target requires local "
    "infrastructure access — run `sdd deploy --target docker` from your own machine "
    "to complete stages 5-6."
)


class TerraformApplyError(Exception):
    """Raised when terraform apply fails or results in partial application."""
    pass


def is_docker_daemon_reachable(timeout: float = 3.0) -> bool:
    """
    Checks if a local or remote Docker daemon is online and responsive.
    Returns True if docker info / docker ps responds cleanly, False otherwise.
    """
    try:
        res = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout
        )
        return res.returncode == 0
    except Exception:
        return False


def apply_plan(
    generated_dir: str | Path,
    plan_filename: str = "tfplan",
    terraform_binary: Optional[str] = None,
    check_daemon: bool = True
) -> Tuple[bool, str]:
    """
    Executes terraform apply tfplan with strict exit status and partial-failure handling.
    If check_daemon is True and no Docker daemon is reachable, stops cleanly without
    attempting terraform apply.
    """
    generated_dir = Path(generated_dir)
    plan_file = generated_dir / plan_filename
    if not plan_file.exists():
        raise FileNotFoundError(f"Plan file not found at {plan_file}")

    if check_daemon and not is_docker_daemon_reachable():
        return False, DAEMON_UNAVAILABLE_MESSAGE

    binary = terraform_binary or find_terraform_binary()

    cmd = [binary, "apply", "-input=false", "-auto-approve", "-no-color", plan_filename]
    res = subprocess.run(
        cmd,
        cwd=generated_dir,
        capture_output=True,
        text=True,
        check=False
    )

    output = (res.stdout + "\n" + res.stderr).strip()

    if res.returncode != 0:
        # Check for partial apply indicators (only for actual apply runs)
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
