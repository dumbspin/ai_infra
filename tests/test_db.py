import os
import tempfile
from pathlib import Path

import pytest

from src import db


@pytest.fixture
def tmp_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(path)
    monkeypatch.delenv("TURSO_DATABASE_URL", raising=False)
    monkeypatch.delenv("TURSO_AUTH_TOKEN", raising=False)
    monkeypatch.setenv("SDD_DB_PATH", path)
    yield Path(path)
    if os.path.exists(path):
        os.unlink(path)


def test_init_db_is_idempotent(tmp_db):
    db.init_db()
    db.init_db()
    assert tmp_db.exists()
    runs = db.get_recent_runs()
    assert runs == []


def test_record_run_round_trip(tmp_db):
    db.init_db()
    row_id = db.record_run(
        spec_commit="abc123ef",
        target="docker",
        status="deployed",
        duration_ms=1500,
        dry_run=False,
    )
    runs = db.get_recent_runs()
    assert len(runs) == 1
    row = runs[0]
    assert row["id"] == row_id
    assert row["spec_commit"] == "abc123ef"
    assert row["target"] == "docker"
    assert row["status"] == "deployed"
    assert row["duration_ms"] == 1500
    assert row["dry_run"] is False
    assert row["failure_stage"] is None
    assert row["failure_detail"] is None
    assert row["created_at"]


def test_get_recent_runs_respects_limit_and_order(tmp_db):
    db.init_db()
    ids = []
    for i in range(5):
        ids.append(
            db.record_run(
                spec_commit=f"commit-{i}",
                target="aws_ecs",
                status="failed" if i % 2 else "deployed",
                duration_ms=100 + i,
                dry_run=True,
                failure_stage="opa_policy" if i % 2 else None,
                failure_detail="denied" if i % 2 else None,
            )
        )
    recent = db.get_recent_runs(limit=3)
    assert len(recent) == 3
    assert [r["id"] for r in recent] == list(reversed(ids))[:3]
    assert [r["spec_commit"] for r in recent] == ["commit-4", "commit-3", "commit-2"]


def test_clear_runs(tmp_db):
    db.init_db()
    db.record_run(
        spec_commit="commit-clear",
        target="docker",
        status="deployed",
        duration_ms=200,
        dry_run=False,
    )
    assert len(db.get_recent_runs()) == 1
    db.clear_runs()
    assert len(db.get_recent_runs()) == 0


def test_fallback_when_turso_unset(monkeypatch, tmp_db):
    monkeypatch.delenv("TURSO_DATABASE_URL", raising=False)
    monkeypatch.delenv("TURSO_AUTH_TOKEN", raising=False)
    db.init_db()
    assert tmp_db.exists()
