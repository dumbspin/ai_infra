import json
import pytest
from pathlib import Path
from src.policy_runner import evaluate_policy

POLICIES_DIR = Path(__file__).parent.parent / "policies"


def create_mock_plan(tmp_path: Path, public_access: bool, ssh_enabled: bool, owner: str) -> Path:
    labels = [
        {"label": "public_access", "value": "true" if public_access else "false"},
        {"label": "ssh_enabled", "value": "true" if ssh_enabled else "false"}
    ]
    if owner:
        labels.append({"label": "owner", "value": owner})

    plan_data = {
        "resource_changes": [
            {
                "address": "docker_container.frontend_1",
                "type": "docker_container",
                "change": {
                    "actions": ["create"],
                    "after": {
                        "name": "frontend-1",
                        "image": "nginx:1.25",
                        "public_access": public_access,
                        "ssh_enabled": ssh_enabled,
                        "labels": labels,
                        "tags": {"owner": owner} if owner else {}
                    }
                }
            }
        ]
    }
    plan_file = tmp_path / "plan.json"
    plan_file.write_text(json.dumps(plan_data), encoding="utf-8")
    return plan_file


def test_policy_allow_compliant_plan(tmp_path):
    plan_file = create_mock_plan(tmp_path, public_access=False, ssh_enabled=False, owner="ayush")
    allow, violations = evaluate_policy(plan_file, POLICIES_DIR)
    assert allow is True
    assert len(violations) == 0


def test_policy_deny_public_access(tmp_path):
    plan_file = create_mock_plan(tmp_path, public_access=True, ssh_enabled=False, owner="ayush")
    allow, violations = evaluate_policy(plan_file, POLICIES_DIR)
    assert allow is False
    assert any("public_access" in v for v in violations)


def test_policy_deny_ssh_enabled(tmp_path):
    plan_file = create_mock_plan(tmp_path, public_access=False, ssh_enabled=True, owner="ayush")
    allow, violations = evaluate_policy(plan_file, POLICIES_DIR)
    assert allow is False
    assert any("SSH" in v or "ssh_enabled" in v for v in violations)


def test_policy_deny_missing_owner(tmp_path):
    plan_file = create_mock_plan(tmp_path, public_access=False, ssh_enabled=False, owner="")
    allow, violations = evaluate_policy(plan_file, POLICIES_DIR)
    assert allow is False
    assert any("owner" in v for v in violations)
