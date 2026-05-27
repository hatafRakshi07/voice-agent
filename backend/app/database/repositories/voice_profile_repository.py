from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.voice_profile import VoiceProfile


class VoiceProfileRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.voice_profiles

    async def create(self, profile: VoiceProfile) -> str:
        doc = profile.model_dump(exclude={"id"}, by_alias=False)
        result = await self.col.insert_one(doc)
        return str(result.inserted_id)

    async def list_all(self) -> list[VoiceProfile]:
        cursor = self.col.find().sort("created_at", -1)
        profiles = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            profiles.append(VoiceProfile(**doc))
        return profiles

    async def get_default(self) -> Optional[VoiceProfile]:
        doc = await self.col.find_one({"is_default": True})
        if doc:
            doc["_id"] = str(doc["_id"])
            return VoiceProfile(**doc)
        return None

    async def set_default(self, voice_id: str) -> None:
        await self.col.update_many({}, {"$set": {"is_default": False}})
        await self.col.update_one(
            {"elevenlabs_voice_id": voice_id}, {"$set": {"is_default": True}}
        )

    async def delete(self, elevenlabs_voice_id: str) -> bool:
        result = await self.col.delete_one(
            {"elevenlabs_voice_id": elevenlabs_voice_id}
        )
        return result.deleted_count > 0
