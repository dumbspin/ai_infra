from typing import Any, Dict, List, Optional
from src.drift.normalizer import normalize_spec, normalize_tfstate


def detect_drift(
    spec: Dict[str, Any],
    tfstate: Dict[str, Any],
    live_containers: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Compares normalized specification desired state against live state / tfstate.
    Classifies drift into count_mismatch, unmanaged_resource, or config_drift.
    """
    norm_spec = normalize_spec(spec)
    norm_state = normalize_tfstate(tfstate)

    drift_items = []

    # 1. Compare spec services against state
    for service_name, spec_cfg in norm_spec["services"].items():
        expected_replicas = spec_cfg["replicas"]
        expected_image = spec_cfg["image"]
        expected_public_access = spec_cfg["public_access"]

        state_instances = norm_state.get(service_name, [])
        actual_replicas = len(state_instances)

        # Check replica count mismatch
        if actual_replicas != expected_replicas:
            drift_items.append({
                "type": "count_mismatch",
                "resource": service_name,
                "expected": expected_replicas,
                "actual": actual_replicas
            })

        # Check config drift across active instances
        for instance in state_instances:
            # Check public access mismatch
            if instance["public_access"] != expected_public_access:
                drift_items.append({
                    "type": "config_drift",
                    "resource": instance["container_name"],
                    "field": "public_access",
                    "expected": expected_public_access,
                    "actual": instance["public_access"]
                })

    # 2. Check for untracked / unmanaged live containers if live_containers list provided
    if live_containers:
        known_container_names = set()
        for instances in norm_state.values():
            for inst in instances:
                known_container_names.add(inst["container_name"])

        for live_c in live_containers:
            c_name = live_c.get("name", "")
            if c_name and c_name not in known_container_names:
                drift_items.append({
                    "type": "unmanaged_resource",
                    "resource": c_name,
                    "source": "docker"
                })

    drift_detected = len(drift_items) > 0

    return {
        "drift_detected": drift_detected,
        "items": drift_items
    }


def render_drift_markdown_report(drift_result: Dict[str, Any]) -> str:
    """Renders structured JSON drift report into clean GitHub Markdown report."""
    if not drift_result.get("drift_detected"):
        return "### Drift Check Status: Clean\n\nNo drift detected. Live infrastructure fully matches specification."

    lines = ["### Drift Check Status: Drift Detected!", "", "| Type | Resource | Details |", "|---|---|---|"]

    for item in drift_result.get("items", []):
        t = item.get("type")
        r = item.get("resource")
        if t == "count_mismatch":
            details = f"Expected replicas: {item.get('expected')}, Actual: {item.get('actual')}"
        elif t == "config_drift":
            details = f"Field '{item.get('field')}' mismatch: expected {item.get('expected')}, actual {item.get('actual')}"
        elif t == "unmanaged_resource":
            details = f"Unmanaged container running in {item.get('source', 'live state')}"
        else:
            details = str(item)

        lines.append(f"| `{t}` | `{r}` | {details} |")

    return "\n".join(lines) + "\n"
