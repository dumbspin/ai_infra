import pytest
from src.compiler.renderer import render_terraform
from src.compiler.llm_client import call_llm_for_plan


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


def test_offline_llm_client_mock():
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

