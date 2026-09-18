import pytest
from src.drift.detector import detect_drift, render_drift_markdown_report


@pytest.fixture
def sample_spec():
    return {
        "application": "ecommerce",
        "environment": "development",
        "services": {
            "frontend": {
                "replicas": 2,
                "image": "nginx:1.25"
            }
        },
        "security": {
            "public_access": False,
            "ssh": False
        }
    }


@pytest.fixture
def sample_tfstate():
    return {
        "resources": [
            {
                "type": "docker_container",
                "name": "frontend_1",
                "instances": [
                    {
                        "attributes": {
                            "name": "frontend-1",
                            "image": "nginx:1.25",
                            "labels": [
                                {"label": "public_access", "value": "false"},
                                {"label": "ssh_enabled", "value": "false"}
                            ]
                        }
                    },
                    {
                        "attributes": {
                            "name": "frontend-2",
                            "image": "nginx:1.25",
                            "labels": [
                                {"label": "public_access", "value": "false"},
                                {"label": "ssh_enabled", "value": "false"}
                            ]
                        }
                    }
                ]
            }
        ]
    }


def test_drift_none_clean(sample_spec, sample_tfstate):
    result = detect_drift(sample_spec, sample_tfstate)
    assert result["drift_detected"] is False
    assert len(result["items"]) == 0
    report = render_drift_markdown_report(result)
    assert "Clean" in report


def test_drift_count_mismatch(sample_spec, sample_tfstate):
    # Change spec expected replicas to 3
    sample_spec["services"]["frontend"]["replicas"] = 3
    result = detect_drift(sample_spec, sample_tfstate)
    assert result["drift_detected"] is True
    assert len(result["items"]) == 1
    assert result["items"][0]["type"] == "count_mismatch"
    assert result["items"][0]["resource"] == "frontend"
    assert result["items"][0]["expected"] == 3
    assert result["items"][0]["actual"] == 2


def test_drift_unmanaged_resource(sample_spec, sample_tfstate):
    live_containers = [
        {"name": "frontend-1"},
        {"name": "frontend-2"},
        {"name": "frontend-3-untracked"}
    ]
    result = detect_drift(sample_spec, sample_tfstate, live_containers=live_containers)
    assert result["drift_detected"] is True
    assert any(item["type"] == "unmanaged_resource" and item["resource"] == "frontend-3-untracked" for item in result["items"])


def test_drift_config_mismatch(sample_spec, sample_tfstate):
    # Change live instance label to public_access = true out of band
    sample_tfstate["resources"][0]["instances"][0]["attributes"]["labels"][0]["value"] = "true"
    result = detect_drift(sample_spec, sample_tfstate)
    assert result["drift_detected"] is True
    assert any(item["type"] == "config_drift" and item["field"] == "public_access" for item in result["items"])
