"""
voice_profile_repository.py  (SQLite)
──────────────────────────────────────
CRUD for the `voice_profiles` table.
"""

from typing import Optional

import aiosqlite

from app.models.voice_profile import VoiceProfile


def _row_to_profile(row: aiosqlite.Row) -> VoiceProfile:
    d = dict(row)
    d["is_default"] = bool(d["is_default"])
    return VoiceProfile(**d)


class VoiceProfileRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def upsert(self, profile: VoiceProfile) -> None:
        """Insert or update a voice profile row."""
        await self.db.execute(
            """INSERT INTO voice_profiles
                   (voice_id, name, description, reference_wav, sample_count, is_default)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(voice_id) DO UPDATE SET
                   name          = excluded.name,
                   description   = excluded.description,
                   reference_wav = excluded.reference_wav,
                   sample_count  = excluded.sample_count,
                   is_default    = excluded.is_default""",
            (
                profile.voice_id,
                profile.name,
                profile.description,
                profile.reference_wav,
                profile.sample_count,
                int(profile.is_default),
            ),
        )
        await self.db.commit()

    async def list_all(self) -> list[VoiceProfile]:
        async with self.db.execute(
            "SELECT * FROM voice_profiles ORDER BY created_at DESC"
        ) as cur:
            rows = await cur.fetchall()
            return [_row_to_profile(r) for r in rows]

    async def get_by_voice_id(self, voice_id: str) -> Optional[VoiceProfile]:
        async with self.db.execute(
            "SELECT * FROM voice_profiles WHERE voice_id = ?", (voice_id,)
        ) as cur:
            row = await cur.fetchone()
            return _row_to_profile(row) if row else None

    async def get_default(self) -> Optional[VoiceProfile]:
        async with self.db.execute(
            "SELECT * FROM voice_profiles WHERE is_default = 1 LIMIT 1"
        ) as cur:
            row = await cur.fetchone()
            return _row_to_profile(row) if row else None

    async def set_default(self, voice_id: str) -> None:
        """Clear any existing default, then mark `voice_id` as default."""
        await self.db.execute("UPDATE voice_profiles SET is_default = 0")
        await self.db.execute(
            "UPDATE voice_profiles SET is_default = 1 WHERE voice_id = ?",
            (voice_id,),
        )
        await self.db.commit()

    async def delete(self, voice_id: str) -> None:
        await self.db.execute(
            "DELETE FROM voice_profiles WHERE voice_id = ?", (voice_id,)
        )
        await self.db.commit()


    async def set_default(self, voice_id: str) -> None:
        await self.col.update_many({}, {"$set": {"is_default": False}})
        await self.col.update_one(
            {"voice_id": voice_id}, {"$set": {"is_default": True}}
        )

    async def delete(self, voice_id: str) -> bool:
        result = await self.col.delete_one(
            {"voice_id": voice_id}
        )
        return result.deleted_count > 0
