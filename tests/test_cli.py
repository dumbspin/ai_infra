import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from typer.testing import CliRunner

from src.cli import app

runner = CliRunner()


def test_cli_validate_valid_spec():
    """Tests sdd validate on a known-good specification."""
    res = runner.invoke(app, ["validate", "specification/infrastructure.yaml"])
    assert res.exit_code == 0
    assert "Specification valid" in res.output


def test_cli_validate_invalid_secret_spec(tmp_path):
    """Tests sdd validate on a spec containing a forbidden secret key."""
    bad_spec = tmp_path / "bad_spec.yaml"
    bad_spec.write_text(
        """
spec_version: "1.0"
application: insecure-app
services:
  web:
    replicas: 1
    image: nginx:latest
metadata:
  owner: team
  password: "supersecretpassword123"
""",
        encoding="utf-8",
    )

    res = runner.invoke(app, ["validate", str(bad_spec)])
    assert res.exit_code == 1
    assert "Forbidden secret key 'password'" in res.output or "secret" in res.output.lower()


def test_cli_validate_missing_file():
    """Tests sdd validate on a non-existent file."""
    res = runner.invoke(app, ["validate", "non_existent_spec.yaml"])
    assert res.exit_code == 1
    assert "not found" in res.output.lower()


def test_cli_compile_valid_spec(tmp_path):
    """Tests sdd compile producing plan and writing to output file."""
    out_file = tmp_path / "plan.json"
    res = runner.invoke(
        app,
        ["compile", "specification/infrastructure.yaml", "--target", "docker", "--output", str(out_file)],
    )
    assert res.exit_code == 0
    assert out_file.exists()
    plan_data = json.loads(out_file.read_text(encoding="utf-8"))
    assert "resources" in plan_data
    assert len(plan_data["resources"]) >= 1


def test_cli_plan_denied_violating_spec():
    """Tests sdd plan on a security-violating spec, asserting exit code 1 and violation details."""
    res = runner.invoke(app, ["plan", "specs/security-violation-demo.yaml"])
    assert res.exit_code == 1
    assert "OPA: denied" in res.output or "Static scan" in res.output
    assert "public_access" in res.output or "ssh" in res.output or "CKV_DOCKER" in res.output


def test_cli_plan_json_output():
    """Tests sdd plan --json outputs valid parseable JSON with stage statuses."""
    res = runner.invoke(app, ["plan", "specification/infrastructure.yaml", "--json"])
    assert res.exit_code == 0
    data = json.loads(res.output)
    assert "terraform" in data
    assert "static_scan" in data
    assert "opa_policy" in data
    assert data["passed"] is True


def test_cli_deploy_dry_run_never_calls_apply():
    """Tests sdd deploy --dry-run verifies the plan but never invokes apply_plan."""
    with patch("src.cli.apply_plan") as mock_apply:
        res = runner.invoke(
            app,
            ["deploy", "specification/infrastructure.yaml", "--target", "docker", "--dry-run"],
        )
        assert res.exit_code == 0
        assert "Dry-run mode" in res.output
        mock_apply.assert_not_called()


def test_cli_history(tmp_path, monkeypatch):
    """Tests sdd history outputs formatted execution history."""
    db_file = tmp_path / "cli-history.db"
    monkeypatch.setenv("SDD_DB_PATH", str(db_file))
    from src.db import init_db, record_run
    init_db()
    record_run("942f6187", "docker", "deployed", 2374, True)
    res = runner.invoke(app, ["history", "--limit", "5"])
    assert res.exit_code == 0
    assert "Pipeline Execution History" in res.output or "Run ID" in res.output
