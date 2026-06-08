"""
sqlite.py
─────────
Async SQLite database layer using aiosqlite.

A single WAL-mode connection is shared across the app.  All writes are
serialised by SQLite; WAL mode allows concurrent reads alongside writes.
"""

import aiosqlite
from pathlib import Path
from typing import Optional

from app.config import settings
from app.utils.logger import logger

# ── Module-level connection ────────────────────────────────────────────────────
_db: Optional[aiosqlite.Connection] = None

# ── Schema ─────────────────────────────────────────────────────────────────────
_CREATE_SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS calls (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id          TEXT    UNIQUE NOT NULL,
    phone_number     TEXT    NOT NULL DEFAULT 'unknown',
    direction        TEXT    NOT NULL DEFAULT 'inbound',
    status           TEXT    NOT NULL DEFAULT 'ringing',
    voice_id         TEXT,
    start_time       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    end_time         TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    recording_path   TEXT,
    summary          TEXT,
    turn_count       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id     TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('user','assistant','system')),
    content     TEXT    NOT NULL,
    timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    confidence  REAL,
    latency_ms  INTEGER,
    FOREIGN KEY (call_id) REFERENCES calls(call_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS voice_profiles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    voice_id      TEXT    UNIQUE NOT NULL,
    name          TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    reference_wav TEXT,
    sample_count  INTEGER NOT NULL DEFAULT 0,
    is_default    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_calls_status    ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_start     ON calls(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_conv_call_id    ON conversations(call_id);
CREATE INDEX IF NOT EXISTS idx_conv_timestamp  ON conversations(timestamp);
"""


async def connect_db() -> None:
    """Open the SQLite connection and initialise the schema."""
    global _db
    db_path = Path(settings.SQLITE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    _db = await aiosqlite.connect(str(db_path), check_same_thread=False)
    _db.row_factory = aiosqlite.Row
    await _db.executescript(_CREATE_SCHEMA)
    await _db.commit()
    logger.info(f"[DB] SQLite connected → {db_path}")


async def disconnect_db() -> None:
    """Close the database connection gracefully."""
    global _db
    if _db is not None:
        await _db.close()
        _db = None
    logger.info("[DB] SQLite disconnected")


async def get_db() -> aiosqlite.Connection:
    """Return the shared database connection (raises if not initialised)."""
    if _db is None:
        raise RuntimeError("Database not initialised — call connect_db() first")
    return _db
