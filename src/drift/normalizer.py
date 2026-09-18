from typing import Any, Dict, List


def normalize_spec(spec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts normalized desired state subset from the input spec:
    {
       "services": {
           "frontend": {"replicas": 2, "image": "nginx:1.25", "public_access": false, "ssh_enabled": false},
           "backend": {"replicas": 2, "image": "node:20-alpine", ...}
       }
    }
    """
    sec = spec.get("security", {})
    public_access = sec.get("public_access", False)
    ssh_enabled = sec.get("ssh", False)

    normalized_services = {}
    for name, config in spec.get("services", {}).items():
        normalized_services[name] = {
            "replicas": config.get("replicas", 1),
            "image": config.get("image", ""),
            "public_access": public_access,
            "ssh_enabled": ssh_enabled
        }

    return {
        "application": spec.get("application", ""),
        "environment": spec.get("environment", ""),
        "services": normalized_services
    }


def normalize_tfstate(tfstate: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extracts managed docker containers from terraform.tfstate and groups them by base service name.
    """
    services_state: Dict[str, List[Dict[str, Any]]] = {}

    resources = tfstate.get("resources", [])
    for res in resources:
        if res.get("type") == "docker_container":
            for instance in res.get("instances", []):
                attributes = instance.get("attributes", {})
                container_name = attributes.get("name", "")
                image = attributes.get("image", "")

                # Parse base service name (e.g. "frontend-1" -> "frontend")
                if "-" in container_name and container_name.rsplit("-", 1)[1].isdigit():
                    base_service = container_name.rsplit("-", 1)[0]
                else:
                    base_service = container_name

                labels_dict = {}
                # Extract labels if present
                labels_raw = attributes.get("labels", [])
                if isinstance(labels_raw, list):
                    for lbl in labels_raw:
                        if isinstance(lbl, dict):
                            labels_dict[lbl.get("label")] = lbl.get("value")
                elif isinstance(labels_raw, dict):
                    labels_dict = labels_raw

                entry = {
                    "container_name": container_name,
                    "image": image,
                    "public_access": labels_dict.get("public_access") == "true",
                    "ssh_enabled": labels_dict.get("ssh_enabled") == "true",
                    "owner": labels_dict.get("owner", "")
                }

                services_state.setdefault(base_service, []).append(entry)

    return services_state
