"""
call_repository.py  (SQLite)
────────────────────────────
CRUD + analytics for the `calls` table.
"""

from datetime import datetime, timezone
from typing import Optional

import aiosqlite

from app.models.call import Call, CallStatus


def _row_to_call(row: aiosqlite.Row) -> Call:
    d = dict(row)
    d["status"] = CallStatus(d["status"])
    return Call(**d)


class CallRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create(self, call: Call) -> int:
        """Insert a new call record; returns the row id."""
        sql = """
            INSERT OR IGNORE INTO calls
                (call_id, phone_number, direction, status, voice_id, start_time)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        async with self.db.execute(
            sql,
            (
                call.call_id,
                call.phone_number,
                call.direction,
                call.status.value,
                call.voice_id,
                call.start_time or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            ),
        ) as cur:
            await self.db.commit()
            return cur.lastrowid or 0

    async def update_status(
        self, call_id: str, status: CallStatus, **extra
    ) -> None:
        fields = ["status = ?"]
        values: list = [status.value]
        for k, v in extra.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(call_id)
        await self.db.execute(
            f"UPDATE calls SET {', '.join(fields)} WHERE call_id = ?",
            values,
        )
        await self.db.commit()

    async def increment_turn_count(self, call_id: str) -> None:
        await self.db.execute(
            "UPDATE calls SET turn_count = turn_count + 1 WHERE call_id = ?",
            (call_id,),
        )
        await self.db.commit()

    async def complete_call(
        self,
        call_id: str,
        end_time: str,
        duration_seconds: int,
        recording_path: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> None:
        await self.db.execute(
            """UPDATE calls
               SET status = ?, end_time = ?, duration_seconds = ?,
                   recording_path = ?, summary = ?
               WHERE call_id = ?""",
            (
                CallStatus.COMPLETED.value,
                end_time,
                duration_seconds,
                recording_path,
                summary,
                call_id,
            ),
        )
        await self.db.commit()

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_call_id(self, call_id: str) -> Optional[Call]:
        async with self.db.execute(
            "SELECT * FROM calls WHERE call_id = ?", (call_id,)
        ) as cur:
            row = await cur.fetchone()
            return _row_to_call(row) if row else None

    async def list_calls(self, skip: int = 0, limit: int = 50) -> list[Call]:
        async with self.db.execute(
            "SELECT * FROM calls ORDER BY start_time DESC LIMIT ? OFFSET ?",
            (limit, skip),
        ) as cur:
            rows = await cur.fetchall()
            return [_row_to_call(r) for r in rows]

    async def get_active_calls(self) -> list[Call]:
        async with self.db.execute(
            "SELECT * FROM calls WHERE status = ?",
            (CallStatus.IN_PROGRESS.value,),
        ) as cur:
            rows = await cur.fetchall()
            return [_row_to_call(r) for r in rows]

    # ── Analytics ──────────────────────────────────────────────────────────────

    async def get_stats(self) -> dict:
        async with self.db.execute("SELECT COUNT(*) FROM calls") as cur:
            total = (await cur.fetchone())[0]

        async with self.db.execute(
            "SELECT COUNT(*) FROM calls WHERE status = ?",
            (CallStatus.COMPLETED.value,),
        ) as cur:
            completed = (await cur.fetchone())[0]

        async with self.db.execute(
            "SELECT COUNT(*) FROM calls WHERE status = ?",
            (CallStatus.IN_PROGRESS.value,),
        ) as cur:
            active = (await cur.fetchone())[0]

        async with self.db.execute(
            "SELECT AVG(duration_seconds) FROM calls WHERE duration_seconds > 0"
        ) as cur:
            row = await cur.fetchone()
            avg_dur = round(row[0], 1) if row[0] else 0.0

        return {
            "total_calls": total,
            "completed_calls": completed,
            "active_calls": active,
            "avg_duration_seconds": avg_dur,
        }

    async def get_daily_stats(self, days: int = 30) -> list[dict]:
        """Return per-day call counts for the last `days` days."""
        async with self.db.execute(
            """
            SELECT
                strftime('%Y-%m-%d', start_time) AS day,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                ROUND(AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END), 1) AS avg_duration
            FROM calls
            WHERE start_time >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
            GROUP BY day
            ORDER BY day ASC
            """,
            (f"-{days} days",),
        ) as cur:
            rows = await cur.fetchall()
            return [
                {
                    "day": r["day"],
                    "total": r["total"],
                    "completed": r["completed"] or 0,
                    "avg_duration": r["avg_duration"] or 0.0,
                }
                for r in rows
            ]
