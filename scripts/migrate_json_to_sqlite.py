"""One-time migration of data/run_history.json into SQLite.

Leaves the original JSON file in place. Safe to re-run: each invocation
inserts new rows (it does not de-duplicate).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db import init_db, record_run

DEFAULT_JSON = ROOT / "data" / "run_history.json"


def _status_from_legacy(entry: dict) -> str:
    status = (entry.get("status") or "").upper()
    if status in ("SUCCESS", "DEPLOYED"):
        return "deployed"
    failed_step = (entry.get("failed_step") or "").lower()
    if failed_step == "opa_policy" or status == "BLOCKED":
        return "blocked"
    return "failed"


def migrate(json_path: Path) -> int:
    if not json_path.exists():
        print(f"No JSON history file at {json_path}; nothing to migrate.")
        return 0

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise SystemExit(f"Expected a JSON array in {json_path}")

    init_db()
    # File is newest-first; insert oldest first so created_at order matches history.
    inserted = 0
    for entry in reversed(payload):
        duration = entry.get("duration_ms")
        if duration is not None:
            duration = int(round(float(duration)))
        record_run(
            spec_commit=entry.get("spec_commit"),
            target=entry.get("target") or "docker",
            status=_status_from_legacy(entry),
            duration_ms=duration,
            dry_run=bool(entry.get("dry_run")),
            failure_stage=entry.get("failed_step"),
            failure_detail=entry.get("error_message"),
        )
        inserted += 1

    print(f"Migrated {inserted} run(s) from {json_path} into SQLite. JSON file left in place.")
    return inserted


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_JSON
    migrate(path)
