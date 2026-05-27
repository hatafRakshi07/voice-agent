from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.conversation import ConversationTurn


class ConversationRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.conversations

    async def add_turn(self, turn: ConversationTurn) -> str:
        doc = turn.model_dump(exclude={"id"}, by_alias=False)
        result = await self.col.insert_one(doc)
        return str(result.inserted_id)

    async def get_by_call_sid(self, call_sid: str) -> list[ConversationTurn]:
        cursor = self.col.find({"call_sid": call_sid}).sort("timestamp", 1)
        turns = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            turns.append(ConversationTurn(**doc))
        return turns

    async def delete_by_call_sid(self, call_sid: str) -> int:
        result = await self.col.delete_many({"call_sid": call_sid})
        return result.deleted_count
