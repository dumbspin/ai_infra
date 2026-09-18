import json
import re
from pathlib import Path
from typing import Any, Dict
import yaml
import jsonschema


class SpecValidationError(Exception):
    """Raised when specification fails JSON Schema validation."""
    pass


class SecretDetectedError(Exception):
    """Raised when hardcoded secrets are detected in the specification."""
    pass


SECRET_KEY_DENYLIST = {
    "password", "api_key", "token", "secret", "private_key",
    "access_key", "secret_key", "auth_token"
}

SECRET_VALUE_REGEX = re.compile(
    r"(?i)(api[_-]?key|secret|password|passwd|token|private[_-]?key)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{8,})['\"]?"
)


def lint_for_secrets(data: Any, path: str = "") -> None:
    """
    Recursively inspects spec dictionary for forbidden secret keys or pattern matches.
    """
    if isinstance(data, dict):
        for k, v in data.items():
            current_path = f"{path}.{k}" if path else k
            if k.lower() in SECRET_KEY_DENYLIST:
                raise SecretDetectedError(f"Forbidden secret key '{k}' found at path '{current_path}'")
            lint_for_secrets(v, current_path)
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            lint_for_secrets(item, f"{path}[{idx}]")
    elif isinstance(data, str):
        if SECRET_VALUE_REGEX.search(data):
            raise SecretDetectedError(f"Potential secret value pattern matched at path '{path}'")


def load_spec(yaml_path: str | Path, schema_path: str | Path = None) -> Dict[str, Any]:
    """
    Loads raw YAML spec, validates structure against JSON Schema, and lints for secrets.
    """
    yaml_path = Path(yaml_path)
    if not yaml_path.exists():
        raise FileNotFoundError(f"Specification file not found at {yaml_path}")

    if schema_path is None:
        schema_path = yaml_path.parent / "schema" / "infra-spec.schema.json"
    else:
        schema_path = Path(schema_path)

    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")

    try:
        raw_text = yaml_path.read_text(encoding="utf-8")
        spec_data = yaml.safe_load(raw_text)
    except yaml.YAMLError as e:
        raise SpecValidationError(f"Invalid YAML syntax in {yaml_path}: {e}")

    if not isinstance(spec_data, dict):
        raise SpecValidationError("Specification must be a top-level YAML object/dictionary")

    # 1. Fast secret linting
    lint_for_secrets(spec_data)

    # 2. JSON Schema validation
    try:
        schema_data = json.loads(schema_path.read_text(encoding="utf-8"))
        jsonschema.validate(instance=spec_data, schema=schema_data)
    except jsonschema.ValidationError as e:
        raise SpecValidationError(f"Specification schema validation failed: {e.message} (at {'.'.join(str(p) for p in e.path)})")
    except json.JSONDecodeError as e:
        raise SpecValidationError(f"Invalid JSON schema file at {schema_path}: {e}")

    return spec_data
