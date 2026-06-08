"""
conversation_repository.py  (SQLite)
──────────────────────────────────────
CRUD for the `conversations` table.
"""

from typing import Optional

import aiosqlite

from app.models.conversation import ConversationTurn


def _row_to_turn(row: aiosqlite.Row) -> ConversationTurn:
    return ConversationTurn(**dict(row))


class ConversationRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def add_turn(self, turn: ConversationTurn) -> int:
        """Insert a conversation turn; returns the row id."""
        async with self.db.execute(
            """INSERT INTO conversations (call_id, role, content, timestamp, confidence, latency_ms)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                turn.call_id,
                turn.role,
                turn.content,
                turn.timestamp or "",
                turn.confidence,
                turn.latency_ms,
            ),
        ) as cur:
            await self.db.commit()
            return cur.lastrowid or 0

    async def get_by_call_id(self, call_id: str) -> list[ConversationTurn]:
        async with self.db.execute(
            "SELECT * FROM conversations WHERE call_id = ? ORDER BY timestamp ASC",
            (call_id,),
        ) as cur:
            rows = await cur.fetchall()
            return [_row_to_turn(r) for r in rows]

    async def delete_by_call_id(self, call_id: str) -> int:
        async with self.db.execute(
            "DELETE FROM conversations WHERE call_id = ?", (call_id,)
        ) as cur:
            await self.db.commit()
            return cur.rowcount or 0

    async def get_common_phrases(self, limit: int = 10) -> list[dict]:
        """Return the most frequent user messages across all calls (basic analytics)."""
        async with self.db.execute(
            """SELECT content, COUNT(*) AS frequency
               FROM conversations
               WHERE role = 'user'
               GROUP BY content
               ORDER BY frequency DESC
               LIMIT ?""",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
            return [{"content": r["content"], "frequency": r["frequency"]} for r in rows]

