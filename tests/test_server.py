import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from src.server import app

client = TestClient(app)


def test_docker_status_endpoint():
    response = client.get("/api/docker/status")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data
    assert "details" in data


def test_validate_spec_endpoint_valid():
    valid_yaml = """
spec_version: "1.0"
application: ecommerce
environment: development
services:
  frontend:
    replicas: 2
    image: nginx:1.25
security:
  public_access: false
  ssh: false
metadata:
  owner: ayush
  created_at: "2026-09-18T00:00:00Z"
"""
    response = client.post("/api/specification/validate", json={"specification": valid_yaml})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["error"] is None


def test_validate_spec_endpoint_invalid_secret():
    secret_yaml = """
spec_version: "1.0"
application: ecommerce
environment: development
services:
  frontend:
    replicas: 2
    image: nginx:1.25
security:
  public_access: false
  ssh: false
  password: "supersecretvalue"
metadata:
  owner: ayush
  created_at: "2026-09-18T00:00:00Z"
"""
    response = client.post("/api/specification/validate", json={"specification": secret_yaml})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert "password" in data["error"]


def test_infrastructure_endpoint():
    response = client.get("/api/infrastructure")
    assert response.status_code == 200
    data = response.json()
    assert "containers" in data
    assert "count" in data


def test_drift_endpoint():
    response = client.get("/api/drift")
    assert response.status_code == 200
    data = response.json()
    assert "drift_detected" in data
    assert "items" in data
    assert "markdown" in data


def test_pipeline_status_telemetry():
    response = client.get("/api/pipeline/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "telemetry" in data
    assert "violations" in data
    assert data["telemetry"]["model"] == "liquid/lfm-2.5-2.6b:free"


def test_drift_reconcile_endpoint():
    response = client.post("/api/drift/reconcile")
    assert response.status_code == 200
    data = response.json()
    assert "drift_detected" in data
    assert "reconciled_actions" in data


def test_policies_endpoints():
    # 1. Get policies
    res = client.get("/api/policies")
    assert res.status_code == 200
    data = res.json()
    assert "policies" in data
    assert len(data["policies"]) >= 3

    # 2. Toggle policy
    res_toggle = client.post("/api/policies/toggle", json={"policy_id": "no_ssh_exposed", "enabled": False})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["policy"]["enabled"] is False

    # Restore
    client.post("/api/policies/toggle", json={"policy_id": "no_ssh_exposed", "enabled": True})


def test_export_bundle_endpoint(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    for target in ("docker", "aws_ecs", "kubernetes"):
        res = client.get(f"/api/export/bundle?target={target}")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/zip"
        assert f"sdd-infra-{target}-bundle.zip" in res.headers["content-disposition"]



def test_security_violation_demo_fixture_denied(monkeypatch):
    """Verifies that specs/security-violation-demo.yaml is blocked by OPA policy gate."""
    from pathlib import Path
    from src.server import execute_pipeline_task, pipeline_state
    
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    fixture_path = Path("specs/security-violation-demo.yaml")
    assert fixture_path.exists(), "specs/security-violation-demo.yaml fixture must exist"
    
    yaml_content = fixture_path.read_text(encoding="utf-8")
    assert "public_access: true" in yaml_content
    assert "ssh: true" in yaml_content

    # Run pipeline with the failing spec
    execute_pipeline_task(yaml_content, target="docker", dry_run=True)
    
    assert pipeline_state["status"] == "FAILED"
    assert pipeline_state["steps"]["opa_policy"] == "FAILED"
    assert len(pipeline_state["violations"]) >= 1
    assert any("public_access" in v.lower() or "ssh" in v.lower() for v in pipeline_state["violations"])
    assert pipeline_state["opa_evaluation"] is not None
    assert pipeline_state["opa_evaluation"]["status"] == "FAILED"


def test_policies_evaluate_endpoint():
    """Tests on-demand /api/policies/evaluate endpoint."""
    res = client.post("/api/policies/evaluate")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "passed_count" in data
    assert "total_count" in data
    assert "summary" in data
    assert "rules" in data


def test_static_scanner_ahead_of_opa():
    """Tests that the static scanner analyzes rendered HCL and returns findings."""
    from pathlib import Path
    import tempfile
    from src.scanner.tf_scanner import scan_terraform
    from src.compiler.renderer import render_terraform

    # 1. Compliant HCL scan
    compliant_plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "frontend",
                "replicas": 1,
                "image": "nginx:1.25",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "platform-team"}
            }
        ]
    }
    comp_hcl = render_terraform(compliant_plan)
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "main.tf").write_text(comp_hcl, encoding="utf-8")
        passed, findings, summary = scan_terraform(tmpdir)
        assert passed is True
        assert len(findings) == 0

    # 2. Failing HCL scan (public_access & ssh_enabled)
    failing_plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "insecure_app",
                "replicas": 1,
                "image": "nginx:1.25",
                "public_access": True,
                "ssh_enabled": True,
                "tags": {"owner": "platform-team"}
            }
        ]
    }
    fail_hcl = render_terraform(failing_plan)
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "main.tf").write_text(fail_hcl, encoding="utf-8")
        passed, findings, summary = scan_terraform(tmpdir)
        assert passed is False
        assert len(findings) >= 2
        check_ids = [f["check_id"] for f in findings]
        assert "CKV_DOCKER_1" in check_ids
        assert "CKV_DOCKER_2" in check_ids


def test_scheduled_drift_monitoring_endpoints():
    """Tests GET /api/drift/schedule and POST /api/drift/schedule/trigger."""
    # 1. Check schedule status
    res = client.get("/api/drift/schedule")
    assert res.status_code == 200
    data = res.json()
    assert data["enabled"] is True
    assert data["interval_seconds"] == 600

    # 2. Trigger immediate scheduled check
    res_trigger = client.post("/api/drift/schedule/trigger")
    assert res_trigger.status_code == 200
    data_trigger = res_trigger.json()
    assert data_trigger["status"] == "completed"
    assert "report" in data_trigger
    assert data_trigger["schedule"]["total_runs"] >= 1


def test_pipeline_run_history_endpoints(monkeypatch, tmp_path):
    """Tests GET /api/pipeline/history and DELETE /api/pipeline/history."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    db_file = tmp_path / "history-test.db"
    monkeypatch.setenv("SDD_DB_PATH", str(db_file))
    from src.db import init_db, clear_runs
    init_db()
    clear_runs()
    # 1. Trigger synthesis dry run
    spec_yaml = """spec_version: "1.0"
application: history-test
environment: development
services:
  web:
    replicas: 1
    image: nginx:1.25
security:
  public_access: false
  ssh: false
metadata:
  owner: qa-team
  created_at: "2026-09-22T00:00:00Z"
"""
    # Execute synchronously in test
    from src.server import execute_pipeline_task
    execute_pipeline_task(spec_yaml, target="docker", dry_run=True)

    # 2. Query history
    res = client.get("/api/pipeline/history")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert len(data["history"]) >= 1
    latest = data["history"][0]
    assert latest["status"] == "SUCCESS"
    assert latest["target"] == "docker"
    assert latest["dry_run"] is True
    assert "spec_hash" in latest
    assert "spec_commit" in latest
    assert "duration_ms" in latest

    # 3. Test failure recording in run history
    failing_spec = """spec_version: "1.0"
application: failing-demo
environment: production
services:
  bad-svc:
    replicas: 1
    image: nginx:1.25
security:
  public_access: true
  ssh: true
metadata:
  owner: platform-team
  created_at: "2026-09-22T00:00:00Z"
"""
    execute_pipeline_task(failing_spec, target="docker", dry_run=True)

    res_fail = client.get("/api/pipeline/history")
    assert res_fail.status_code == 200
    fail_data = res_fail.json()
    latest_fail = fail_data["history"][0]
    assert latest_fail["status"] == "FAILED"
    assert latest_fail["failed_step"] == "opa_policy"
    assert latest_fail["error_message"] is not None



    # 4. Clear history
    del_res = client.delete("/api/pipeline/history")
    assert del_res.status_code == 200
    assert del_res.json()["history"] == []


def test_policy_toggle_allows_violating_spec_when_disabled(monkeypatch):
    """
    Verifies that when policy guardrail toggles (no_public_ingress and no_ssh_exposed)
    are turned OFF, a spec with public_access: true and ssh: true succeeds in both
    Checkov static scanner and OPA policy evaluation without being blocked.
    """
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    from src.server import active_policies, execute_pipeline_task, pipeline_state

    # 1. Turn OFF public ingress and ssh guardrails
    client.post("/api/policies/toggle", json={"policy_id": "no_public_ingress", "enabled": False})
    client.post("/api/policies/toggle", json={"policy_id": "no_ssh_exposed", "enabled": False})
    assert active_policies["no_public_ingress"]["enabled"] is False
    assert active_policies["no_ssh_exposed"]["enabled"] is False

    violation_fixture = Path(__file__).parent.parent / "specs" / "security-violation-demo.yaml"
    assert violation_fixture.exists(), "specs/security-violation-demo.yaml fixture must exist"
    spec_content = violation_fixture.read_text(encoding="utf-8")

    # 2. Execute pipeline in dry_run mode
    execute_pipeline_task(spec_content, target="docker", dry_run=True)

    # 3. Verify pipeline completed successfully with 0 blocking violations
    assert pipeline_state["status"] == "SUCCESS"
    assert pipeline_state["steps"]["opa_policy"] == "SUCCESS"
    assert pipeline_state["static_scan"]["passed"] is True
    assert pipeline_state["opa_evaluation"]["status"] == "PASSED"

    # 4. Re-enable guardrails for subsequent tests
    client.post("/api/policies/toggle", json={"policy_id": "no_public_ingress", "enabled": True})
    client.post("/api/policies/toggle", json={"policy_id": "no_ssh_exposed", "enabled": True})
    assert active_policies["no_public_ingress"]["enabled"] is True
    assert active_policies["no_ssh_exposed"]["enabled"] is True


def test_docker_stage5_stops_cleanly_when_daemon_unreachable(monkeypatch):
    """
    Asserts that when Docker daemon is unreachable, Stage 5 stops with DAEMON_UNAVAILABLE,
    displays the helpful local CLI message, records 'blocked' in history, and never invokes terraform apply.
    """
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    from unittest.mock import MagicMock
    import src.server as server_mod

    mock_is_reachable = MagicMock(return_value=False)
    mock_apply = MagicMock(return_value=(True, "should not be called"))

    monkeypatch.setattr(server_mod, "is_docker_daemon_reachable", mock_is_reachable)
    monkeypatch.setattr(server_mod, "apply_plan", mock_apply)

    valid_yaml = """
spec_version: "1.0"
application: ecommerce-daemon-test
environment: production
services:
  web:
    replicas: 1
    image: nginx:1.25
security:
  public_access: false
  ssh: false
metadata:
  owner: platform-team
  created_at: "2026-10-06T00:00:00Z"
"""
    server_mod.execute_pipeline_task(valid_yaml, target="docker", dry_run=False)

    # 1. Assert terraform apply was never called
    mock_apply.assert_not_called()

    # 2. Assert distinct DAEMON_UNAVAILABLE status (NOT EXECUTION DENIED)
    assert server_mod.pipeline_state["status"] == "BLOCKED"
    assert server_mod.pipeline_state["steps"]["deployment"] == "DAEMON_UNAVAILABLE"
    assert server_mod.pipeline_state["failed_step"] == "deployment"

    # 3. Assert clear, actionable error message without rollback warnings
    expected_msg = (
        "No Docker daemon reachable in this environment. This target requires local "
        "infrastructure access — run `sdd deploy --target docker` from your own machine "
        "to complete stages 5-6."
    )
    assert server_mod.pipeline_state["error_message"] == expected_msg
    assert "Automatic rollback disabled" not in server_mod.pipeline_state["error_message"]


def test_docker_stage5_proceeds_when_daemon_reachable(monkeypatch):
    """
    Asserts that when Docker daemon is reachable, the pipeline proceeds past the check
    and invokes apply_plan cleanly.
    """
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    from unittest.mock import MagicMock
    import src.server as server_mod

    mock_is_reachable = MagicMock(return_value=True)
    mock_apply = MagicMock(return_value=(True, "Apply complete! Resources: 1 added, 0 changed, 0 destroyed."))

    monkeypatch.setattr(server_mod, "is_docker_daemon_reachable", mock_is_reachable)
    monkeypatch.setattr(server_mod, "apply_plan", mock_apply)

    valid_yaml = """
spec_version: "1.0"
application: ecommerce-daemon-test2
environment: production
services:
  web:
    replicas: 1
    image: nginx:1.25
security:
  public_access: false
  ssh: false
metadata:
  owner: platform-team
  created_at: "2026-10-06T00:00:00Z"
"""
    server_mod.execute_pipeline_task(valid_yaml, target="docker", dry_run=False)

    # 1. Assert terraform apply was invoked
    mock_apply.assert_called_once()

    # 2. Assert pipeline succeeded all the way through
    assert server_mod.pipeline_state["status"] == "SUCCESS"
    assert server_mod.pipeline_state["steps"]["deployment"] == "SUCCESS"
    assert server_mod.pipeline_state["steps"]["verification"] == "SUCCESS"
    assert server_mod.pipeline_state["steps"]["drift_check"] == "SUCCESS"






