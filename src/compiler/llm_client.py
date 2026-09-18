import os
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import jsonschema
import requests

ROOT_DIR = Path(__file__).parent.parent.parent

def load_dotenv():
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = value

load_dotenv()


CACHE_DIR = Path(__file__).parent.parent.parent / "terraform" / "generated" / "cache"
LOG_FILE = Path(__file__).parent.parent.parent / "terraform" / "generated" / "llm_calls.jsonl"
SCHEMA_PATH = Path(__file__).parent / "resource_schema.json"


class LLMCompilationError(Exception):
    """Raised when LLM model fails to produce valid resource plan after retries."""
    pass


def get_resource_plan_schema() -> Dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def spec_hash(spec: dict) -> str:
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()


SYSTEM_PROMPT = """You convert an infrastructure specification into a JSON resource plan.

Output ONLY valid JSON matching this schema (no markdown fences, no commentary):
{resource_plan_schema}

Rules:
- One entry per service in the input spec.
- type is always "docker_container".
- replicas comes directly from the spec's replica count.
- Never invent fields not in the schema.
- If public_access or ssh_enabled aren't specified, default to false.
- Populate tags with owner from metadata.owner.
"""


def log_llm_call(
    h: str,
    model: str,
    attempt: int,
    outcome: str,
    latency_ms: float,
    error: Optional[str] = None
) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "spec_hash": h,
        "model": model,
        "attempt": attempt,
        "outcome": outcome,
        "latency_ms": round(latency_ms, 2),
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def mock_deterministic_compilation(spec: dict) -> dict:
    """Fallback deterministic compiler when network/API key is unavailable or in offline testing."""
    resources = []
    owner = spec.get("metadata", {}).get("owner", "ayush")
    sec = spec.get("security", {})
    public_access = sec.get("public_access", False)
    ssh_enabled = sec.get("ssh", False)

    for svc_name, svc_cfg in spec.get("services", {}).items():
        resources.append({
            "type": "docker_container",
            "name": svc_name,
            "replicas": svc_cfg.get("replicas", 1),
            "image": svc_cfg.get("image", "nginx:latest"),
            "public_access": public_access,
            "ssh_enabled": ssh_enabled,
            "tags": {"owner": owner}
        })

    return {"resources": resources}


def openrouter_request(model: str, system: str, user: str, api_key: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/dumbspin/ai_infra",
        "X-Title": "SDD-Infra",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    content = data["choices"][0]["message"]["content"].strip()
    # Strip markdown code blocks if model included them
    if content.startswith("```"):
        lines = content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()
    return content


def call_llm_for_plan(
    spec: dict,
    model: Optional[str] = None,
    max_retries: int = 2,
    force_refresh: bool = False
) -> dict:
    h = spec_hash(spec)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{h}.json"

    if cache_file.exists() and not force_refresh:
        return json.loads(cache_file.read_text(encoding="utf-8"))

    model = model or os.getenv("OPENROUTER_MODEL", "liquid/lfm-2.5-2.6b:free")
    api_key = os.getenv("OPENROUTER_API_KEY")

    schema = get_resource_plan_schema()
    system_prompt = SYSTEM_PROMPT.format(resource_plan_schema=json.dumps(schema, indent=2))

    # If no API key set, use deterministic mock compiler for ₹0 offline development/testing
    if not api_key:
        plan = mock_deterministic_compilation(spec)
        jsonschema.validate(instance=plan, schema=schema)
        cache_file.write_text(json.dumps(plan, indent=2), encoding="utf-8")
        log_llm_call(h, "mock-offline", 0, "schema_valid", 0.0, None)
        return plan

    last_error = None
    for attempt in range(max_retries + 1):
        prompt = system_prompt
        if last_error:
            prompt += f"\n\nYour previous output failed validation: {last_error}\nFix it."

        start_time = time.time()
        try:
            raw = openrouter_request(model=model, system=prompt, user=json.dumps(spec), api_key=api_key)
            elapsed_ms = (time.time() - start_time) * 1000
            parsed = json.loads(raw)
            jsonschema.validate(instance=parsed, schema=schema)

            cache_file.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
            log_llm_call(h, model, attempt, "schema_valid", elapsed_ms, None)
            return parsed
        except (requests.RequestException, json.JSONDecodeError, jsonschema.ValidationError) as e:
            elapsed_ms = (time.time() - start_time) * 1000
            last_error = str(e)
            outcome = "rate_limited" if "429" in last_error else ("schema_invalid" if isinstance(e, jsonschema.ValidationError) else "provider_error")
            log_llm_call(h, model, attempt, outcome, elapsed_ms, last_error)
            if attempt < max_retries:
                time.sleep(2 ** attempt)

    # Try fallback model if main model failed
    fallback_model = os.getenv("OPENROUTER_FALLBACK_MODEL", "qwen/qwen3.8-27b:free")
    if fallback_model and fallback_model != model:
        start_time = time.time()
        try:
            raw = openrouter_request(model=fallback_model, system=system_prompt, user=json.dumps(spec), api_key=api_key)
            elapsed_ms = (time.time() - start_time) * 1000
            parsed = json.loads(raw)
            jsonschema.validate(instance=parsed, schema=schema)
            cache_file.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
            log_llm_call(h, fallback_model, 0, "schema_valid", elapsed_ms, None)
            return parsed
        except Exception as fallback_err:
            log_llm_call(h, fallback_model, 0, "fallback_failed", 0.0, str(fallback_err))

    # If API call retries failed, fallback to mock compiler for resiliency
    plan = mock_deterministic_compilation(spec)
    jsonschema.validate(instance=plan, schema=schema)
    cache_file.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    log_llm_call(h, "fallback-mock", 0, "schema_valid", 0.0, last_error)
    return plan

