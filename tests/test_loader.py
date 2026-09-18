import pytest
from pathlib import Path
from src.loader import load_spec, SpecValidationError, SecretDetectedError

SPEC_DIR = Path(__file__).parent.parent / "specification"
VALID_SPEC_PATH = SPEC_DIR / "infrastructure.yaml"
SCHEMA_PATH = SPEC_DIR / "schema" / "infra-spec.schema.json"


def test_load_valid_spec():
    spec = load_spec(VALID_SPEC_PATH, SCHEMA_PATH)
    assert spec["spec_version"] == "1.0"
    assert spec["application"] == "ecommerce"
    assert spec["environment"] == "development"
    assert "frontend" in spec["services"]
    assert spec["services"]["frontend"]["replicas"] == 2


def test_missing_spec_file():
    with pytest.raises(FileNotFoundError):
        load_spec("non_existent_spec.yaml", SCHEMA_PATH)


def test_invalid_schema_field(tmp_path):
    invalid_yaml = tmp_path / "invalid_schema.yaml"
    invalid_yaml.write_text("""
spec_version: "1.0"
application: ecommerce
environment: invalid_env
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
""")
    with pytest.raises(SpecValidationError, match="schema validation failed"):
        load_spec(invalid_yaml, SCHEMA_PATH)


def test_secret_key_denylist(tmp_path):
    secret_yaml = tmp_path / "secret_key.yaml"
    secret_yaml.write_text("""
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
""")
    with pytest.raises(SecretDetectedError, match="Forbidden secret key 'password'"):
        load_spec(secret_yaml, SCHEMA_PATH)


def test_secret_regex_pattern(tmp_path):
    secret_pattern_yaml = tmp_path / "secret_regex.yaml"
    secret_pattern_yaml.write_text("""
spec_version: "1.0"
application: ecommerce
environment: development
services:
  frontend:
    replicas: 2
    image: "nginx:1.25?api_key=1234567890abcdef"
security:
  public_access: false
  ssh: false
metadata:
  owner: ayush
  created_at: "2026-09-18T00:00:00Z"
""")
    with pytest.raises(SecretDetectedError, match="Potential secret value pattern matched"):
        load_spec(secret_pattern_yaml, SCHEMA_PATH)
