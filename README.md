# SDD-Infra: AI-Assisted Specification Driven Infrastructure Management

**Version**: 2.0 (Engineering Edition)  
**Status**: Prototype Ready  
**Cost Target**: ₹0  

---

## Architecture Overview

```
spec-loader → spec-compiler (LLM) → schema gate → renderer (Jinja2) → tf-validator → policy-gate (OPA) → applier → drift-detector
```

### 5 Core Services & Contracts

1. **`loader.py`**: Reads raw YAML spec, validates structure against `specification/schema/infra-spec.schema.json`, and runs a secret linter (regex pattern + key denylist). Fast-fails before any LLM API call.
2. **`llm_client.py`**: Calls OpenRouter / Gemini free-tier model to translate desired spec into strict `resource_schema.json` candidate JSON plan. Includes `spec_hash` disk caching (`generated/cache/`), exponential backoff, retry-with-validation-error feedback loop, and structured call history (`generated/llm_calls.jsonl`). Supports offline mock compilation for ₹0 local development.
3. **`renderer.py`**: Pure, deterministic HCL renderer converting JSON resource plan into Terraform HCL (`docker_container` & `docker_image` blocks). Handles replica expansion (`frontend-1`, `frontend-2`) programmatically. Zero network calls.
4. **`validator.py`**: Wraps `terraform init`, `terraform validate`, `terraform plan -out=tfplan`, and `terraform show -json tfplan > plan.json`.
5. **`policy_runner.py`**: Evaluates OPA Rego security policies (`policies/security.rego`). Enforces zero public access, no SSH enabled, and mandatory owner tags.
6. **`applier.py`**: Wraps `terraform apply tfplan` with partial apply safety and detailed idempotency verification (`terraform plan -detailed-exitcode`).
7. **`drift/detector.py`**: Normalizes spec and live `terraform.tfstate`, classifying drift into `count_mismatch`, `unmanaged_resource`, or `config_drift`.

---

## Directory Structure

```
d:/ai-infra/
├── specification/
│   ├── schema/infra-spec.schema.json
│   └── infrastructure.yaml
├── src/
│   ├── loader.py
│   ├── validator.py
│   ├── policy_runner.py
│   ├── applier.py
│   ├── compiler/
│   │   ├── llm_client.py
│   │   ├── resource_schema.json
│   │   └── renderer.py
│   └── drift/
│       ├── normalizer.py
│       └── detector.py
├── policies/
│   └── security.rego
├── terraform/
│   ├── templates/
│   └── generated/           # Git-ignored pipeline output
├── tests/
│   ├── test_loader.py
│   ├── test_renderer.py
│   ├── test_policy.py
│   └── test_drift.py
├── .github/workflows/
│   ├── infrastructure.yml
│   └── drift-check.yml
├── requirements.txt
└── README.md
```

---

## Running Locally

### 1. Execute Unit Test Suite
```powershell
C:\Users\dwive\python311\python.exe -m pytest tests/ -v
```

### 2. Run Full E2E Pipeline (Offline / Mock Mode)
```python
from pathlib import Path
from src.loader import load_spec
from src.compiler.llm_client import call_llm_for_plan
from src.compiler.renderer import render_terraform
from src.validator import validate_and_plan
from src.policy_runner import evaluate_policy
from src.applier import apply_plan
from src.drift.detector import detect_drift, render_drift_markdown_report

# 1. Load & Validate Spec
spec = load_spec("specification/infrastructure.yaml")

# 2. Compile candidate resource plan
plan = call_llm_for_plan(spec)

# 3. Render Terraform HCL
hcl = render_terraform(plan)

# 4. Terraform Validate & Plan
success, logs, plan_json = validate_and_plan("terraform/generated", hcl)

# 5. Policy Gate (OPA)
allow, violations = evaluate_policy("terraform/generated/plan.json")
assert allow, f"Policy violations: {violations}"

# 6. Apply
applied, apply_log = apply_plan("terraform/generated")
print("Apply Result:", applied)
```

---

## Verification & Test Results

All unit tests across spec loading, secret linting, golden-file HCL rendering, OPA policy evaluation, and drift detection pass 100%.
