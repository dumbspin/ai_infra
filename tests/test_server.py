import pytest
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
