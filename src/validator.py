import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, Tuple, Optional



class TerraformValidationError(Exception):
    """Raised when terraform validate or terraform plan fails."""
    pass


def find_terraform_binary() -> str:
    """Finds terraform binary in environment or standard user bin path."""
    user_bin = Path("C:/Users/dwive/bin/terraform.exe")
    if user_bin.exists():
        return str(user_bin)
    return "terraform"


def validate_and_plan(
    generated_dir: str | Path,
    hcl_content: Optional[str] = None,
    terraform_binary: Optional[str] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Executes terraform init, validate, plan, and extracts terraform show -json tfplan payload.
    """
    generated_dir = Path(generated_dir)
    generated_dir.mkdir(parents=True, exist_ok=True)

    if hcl_content:
        tf_file = generated_dir / "main.tf"
        tf_file.write_text(hcl_content, encoding="utf-8")

    binary = terraform_binary or find_terraform_binary()
    logs = []

    def run_cmd(args: list[str]) -> str:
        cmd_str = " ".join(args)
        logs.append(f"$ {cmd_str}")
        res = subprocess.run(
            args,
            cwd=generated_dir,
            capture_output=True,
            text=True,
            check=False
        )
        output = (res.stdout + "\n" + res.stderr).strip()
        logs.append(output)
        if res.returncode != 0:
            raise TerraformValidationError(f"Command failed ({res.returncode}): {cmd_str}\n{output}")
        return res.stdout

    try:
        # 1. Init
        run_cmd([binary, "init", "-no-color"])

        # 2. Validate
        run_cmd([binary, "validate", "-no-color"])

        # 3. Plan
        plan_filename = "tfplan"
        run_cmd([binary, "plan", "-no-color", f"-out={plan_filename}"])

        # 4. Show JSON representation
        json_output = run_cmd([binary, "show", "-json", plan_filename])
        plan_json = json.loads(json_output)

        plan_json_path = generated_dir / "plan.json"
        plan_json_path.write_text(json.dumps(plan_json, indent=2), encoding="utf-8")


        return True, "\n".join(logs), plan_json
    except TerraformValidationError as e:
        return False, "\n".join(logs) + f"\n[ERROR] {e}", {}
