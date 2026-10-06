"""Database persistence for SDD-Infra pipeline run history.

Supports Turso (libSQL) in production and falls back to local SQLite file for
local development and CI testing when TURSO_DATABASE_URL is not configured.

All database access for run history goes through this module — route handlers,
the CLI, and other components must not open their own connections.
"""

from __future__ import annotations

import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOCK = threading.Lock()

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DB_PATH = _PROJECT_ROOT / "data" / "sdd.db"


def get_db_path() -> Path:
    """Resolve the database file path from SDD_DB_PATH, or the local default."""
    raw = os.environ.get("SDD_DB_PATH")
    if raw:
        return Path(raw).expanduser()
    return _DEFAULT_DB_PATH


def _connect():
    """Connect to Turso (libSQL) if configured; otherwise fall back to local SQLite."""
    turso_url = os.environ.get("TURSO_DATABASE_URL")
    if turso_url:
        import libsql

        auth_token = os.environ.get("TURSO_AUTH_TOKEN")
        return libsql.connect(turso_url, auth_token=auth_token)

    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(str(path), check_same_thread=False)


def init_db() -> None:
    """Create the runs table and created_at index if they do not already exist."""
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  spec_commit TEXT,
                  target TEXT NOT NULL,
                  status TEXT NOT NULL,
                  duration_ms INTEGER,
                  dry_run INTEGER NOT NULL DEFAULT 0,
                  failure_stage TEXT,
                  failure_detail TEXT,
                  created_at TEXT NOT NULL
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC)"
            )
            conn.commit()
        finally:
            conn.close()


def record_run(
    spec_commit: Optional[str],
    target: str,
    status: str,
    duration_ms: Optional[int],
    dry_run: bool,
    failure_stage: Optional[str] = None,
    failure_detail: Optional[str] = None,
) -> int:
    """Insert one terminal pipeline run and return the new row id."""
    init_db()
    if status == "deployed":
        failure_stage = None
        failure_detail = None
    if duration_ms is not None:
        duration_ms = int(round(duration_ms))
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    with _LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO runs (
                    spec_commit, target, status, duration_ms, dry_run,
                    failure_stage, failure_detail, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    spec_commit,
                    target,
                    status,
                    duration_ms,
                    1 if dry_run else 0,
                    failure_stage,
                    failure_detail,
                    created_at,
                ),
            )
            conn.commit()
            return int(cur.lastrowid)
        finally:
            conn.close()


def _row_to_dict(row: Any, description: Optional[Any] = None) -> Dict[str, Any]:
    if isinstance(row, dict):
        d = row
    elif hasattr(row, "keys"):
        d = {k: row[k] for k in row.keys()}
    elif description:
        cols = [col[0] for col in description]
        d = dict(zip(cols, row))
    else:
        d = {
            "id": row[0],
            "spec_commit": row[1],
            "target": row[2],
            "status": row[3],
            "duration_ms": row[4],
            "dry_run": row[5],
            "failure_stage": row[6],
            "failure_detail": row[7],
            "created_at": row[8],
        }

    return {
        "id": d["id"],
        "spec_commit": d["spec_commit"],
        "target": d["target"],
        "status": d["status"],
        "duration_ms": d["duration_ms"],
        "dry_run": bool(d["dry_run"]),
        "failure_stage": d["failure_stage"],
        "failure_detail": d["failure_detail"],
        "created_at": d["created_at"],
    }


def get_recent_runs(limit: int = 20) -> List[Dict[str, Any]]:
    """Return the most recent runs as dicts, newest first."""
    init_db()
    if limit < 0:
        limit = 0
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, spec_commit, target, status, duration_ms, dry_run,
                       failure_stage, failure_detail, created_at
                FROM runs
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (int(limit),),
            )
            rows = cur.fetchall()
            desc = cur.description
            return [_row_to_dict(r, desc) for r in rows]
        finally:
            conn.close()


def clear_runs() -> None:
    """Delete all persisted pipeline runs."""
    init_db()
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM runs")
            conn.commit()
        finally:
            conn.close()
