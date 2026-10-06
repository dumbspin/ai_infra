import json
import pytest
from unittest.mock import patch
from src.compiler.renderer import render_terraform
from src.compiler.llm_client import call_llm_for_plan, mock_deterministic_compilation


def test_renderer_single_replica():
    plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "database",
                "replicas": 1,
                "image": "postgres:16",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "ayush"}
            }
        ]
    }
    tf_hcl = render_terraform(plan)
    assert 'resource "docker_container" "database"' in tf_hcl
    assert 'resource "docker_image" "database_img"' in tf_hcl
    assert 'image = docker_image.database_img.image_id' in tf_hcl
    assert 'value = "ayush"' in tf_hcl
    assert 'value = "false"' in tf_hcl


def test_renderer_multi_replica_expansion():
    plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "frontend",
                "replicas": 2,
                "image": "nginx:1.25",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "ayush"}
            }
        ]
    }
    tf_hcl = render_terraform(plan)
    # Replicas > 1 should produce frontend-1 and frontend-2 container resources
    assert 'resource "docker_container" "frontend_1"' in tf_hcl
    assert 'resource "docker_container" "frontend_2"' in tf_hcl
    assert 'name  = "frontend-1"' in tf_hcl
    assert 'name  = "frontend-2"' in tf_hcl
    # Only one docker_image resource should be created
    assert tf_hcl.count('resource "docker_image"') == 1


def test_offline_llm_client_mock(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    spec = {
        "spec_version": "1.0",
        "application": "ecommerce",
        "environment": "development",
        "services": {
            "backend": {
                "replicas": 2,
                "image": "node:20-alpine"
            }
        },
        "security": {
            "public_access": False,
            "ssh": False
        },
        "metadata": {
            "owner": "ayush",
            "created_at": "2026-09-18T00:00:00Z"
        }
    }
    plan = call_llm_for_plan(spec, force_refresh=True)
    assert "resources" in plan
    assert len(plan["resources"]) == 1
    assert plan["resources"][0]["name"] == "backend"
    assert plan["resources"][0]["replicas"] == 2
    assert plan["resources"][0]["tags"]["owner"] == "ayush"


def test_renderer_aws_ecs():
    plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "frontend",
                "replicas": 2,
                "image": "nginx:1.25",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "platform-team"}
            }
        ]
    }
    hcl = render_terraform(plan, target="aws_ecs")
    assert 'resource "aws_ecs_cluster" "main"' in hcl
    assert 'resource "aws_ecs_task_definition" "frontend_task"' in hcl
    assert 'resource "aws_ecs_service" "frontend_svc"' in hcl
    assert 'launch_type     = "FARGATE"' in hcl
    assert 'desired_count   = 2' in hcl
    assert 'resource "aws_security_group" "frontend_sg"' in hcl


def test_renderer_kubernetes():
    plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "backend",
                "replicas": 3,
                "image": "node:20-alpine",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "platform-team"}
            }
        ]
    }
    hcl = render_terraform(plan, target="kubernetes")
    assert 'resource "kubernetes_namespace" "app_ns"' in hcl
    assert 'resource "kubernetes_deployment" "backend_deployment"' in hcl
    assert 'resource "kubernetes_service" "backend_service"' in hcl
    assert 'replicas = 3' in hcl
    assert 'type = "ClusterIP"' in hcl


def test_renderer_spec_commit_tagging():
    plan = {
        "resources": [
            {
                "type": "docker_container",
                "name": "web",
                "replicas": 1,
                "image": "nginx:latest",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {"owner": "devops-team", "spec_commit": "a1b2c3d"}
            }
        ]
    }
    # 1. Docker tagging
    docker_hcl = render_terraform(plan, target="docker", spec_commit="a1b2c3d")
    assert 'label = "owner"' in docker_hcl
    assert 'value = "devops-team"' in docker_hcl
    assert 'label = "spec_commit"' in docker_hcl
    assert 'value = "a1b2c3d"' in docker_hcl

    # 2. AWS ECS tagging
    aws_hcl = render_terraform(plan, target="aws_ecs", spec_commit="a1b2c3d")
    assert 'spec_commit  = "a1b2c3d"' in aws_hcl or 'spec_commit = "a1b2c3d"' in aws_hcl

    # 3. Kubernetes tagging
    k8s_hcl = render_terraform(plan, target="kubernetes", spec_commit="a1b2c3d")
    assert 'spec_commit  = "a1b2c3d"' in k8s_hcl or 'spec_commit = "a1b2c3d"' in k8s_hcl


def test_retry_with_feedback_success_on_second_attempt(monkeypatch):
    """
    Test: OpenRouter returns invalid schema on 1st call and valid schema on 2nd call.
    Asserts:
      (a) 2nd call's prompt contains the original validation error message
      (b) final returned plan is the valid one from attempt 2
      (c) offline fallback was NOT invoked
    """
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-api-key-123")

    sample_spec = {
        "spec_version": "1.0",
        "application": "ecommerce-test",
        "environment": "production",
        "services": {
            "web": {
                "replicas": 2,
                "image": "nginx:1.25"
            }
        },
        "security": {
            "public_access": False,
            "ssh": False
        },
        "metadata": {
            "owner": "platform-team",
            "created_at": "2026-09-22T00:00:00Z"
        }
    }

    invalid_first_response = json.dumps({
        "resources": [
            {
                "type": "docker_container",
                "name": "web",
                "unexpected_field": "invalid"
            }
        ]
    })

    valid_second_response = json.dumps({
        "resources": [
            {
                "type": "docker_container",
                "name": "web",
                "replicas": 2,
                "image": "nginx:1.25",
                "public_access": False,
                "ssh_enabled": False,
                "tags": {
                    "owner": "platform-team"
                }
            }
        ]
    })

    call_prompts = []

    def mock_openrouter(model, system, user, api_key):
        call_prompts.append(system)
        if len(call_prompts) == 1:
            return invalid_first_response
        return valid_second_response

    with patch("src.compiler.llm_client.openrouter_request", side_effect=mock_openrouter) as mock_req, \
         patch("src.compiler.llm_client.mock_deterministic_compilation", wraps=mock_deterministic_compilation) as mock_fallback:

        plan = call_llm_for_plan(sample_spec, force_refresh=True)

        # (a) Assert second call contains the original error message
        assert mock_req.call_count == 2
        assert "Your previous output failed validation with this error:" in call_prompts[1]

        # (b) Assert final returned plan is the valid one from attempt 2
        assert plan["resources"][0]["name"] == "web"
        assert plan["resources"][0]["replicas"] == 2
        assert plan["resources"][0]["tags"]["owner"] == "platform-team"

        # (c) Assert offline fallback was NOT invoked
        mock_fallback.assert_not_called()


def test_retry_with_feedback_fallback_when_both_attempts_fail(monkeypatch):
    """
    Test: BOTH calls return invalid output.
    Asserts:
      (a) offline fallback IS invoked
      (b) only one retry happened (mock called exactly 2 times total, not 3 or more)
    """
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-api-key-123")

    sample_spec = {
        "spec_version": "1.0",
        "application": "ecommerce-test",
        "environment": "production",
        "services": {
            "web": {
                "replicas": 2,
                "image": "nginx:1.25"
            }
        },
        "security": {
            "public_access": False,
            "ssh": False
        },
        "metadata": {
            "owner": "platform-team",
            "created_at": "2026-09-22T00:00:00Z"
        }
    }

    invalid_response = "INVALID JSON PAYLOAD"

    with patch("src.compiler.llm_client.openrouter_request", return_value=invalid_response) as mock_req, \
         patch("src.compiler.llm_client.mock_deterministic_compilation", wraps=mock_deterministic_compilation) as mock_fallback:

        plan = call_llm_for_plan(sample_spec, force_refresh=True)

        # (b) Assert mock was called exactly twice total, not 3 or more times
        assert mock_req.call_count == 2

        # (a) Assert offline fallback IS invoked
        mock_fallback.assert_called_once()
        assert "resources" in plan
        assert plan["resources"][0]["name"] == "web"
        assert plan["resources"][0]["replicas"] == 2



