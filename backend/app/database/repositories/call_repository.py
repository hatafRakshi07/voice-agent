from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.call import Call, CallStatus


class CallRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.calls

    # ─── Write ───────────────────────────────────────────────────────────────

    async def create(self, call: Call) -> str:
        doc = call.model_dump(exclude={"id"}, by_alias=False)
        result = await self.col.insert_one(doc)
        return str(result.inserted_id)

    async def update_status(
        self, call_sid: str, status: CallStatus, **extra
    ) -> None:
        await self.col.update_one(
            {"call_sid": call_sid},
            {"$set": {"status": status.value, **extra}},
            upsert=True,
        )

    async def increment_turn_count(self, call_sid: str) -> None:
        await self.col.update_one(
            {"call_sid": call_sid}, {"$inc": {"turn_count": 1}}
        )

    async def complete_call(
        self, call_sid: str, summary: Optional[str] = None
    ) -> None:
        end_time = datetime.utcnow()
        doc = await self.col.find_one({"call_sid": call_sid})
        duration = 0
        if doc and doc.get("start_time"):
            duration = int((end_time - doc["start_time"]).total_seconds())

        await self.col.update_one(
            {"call_sid": call_sid},
            {
                "$set": {
                    "status": CallStatus.COMPLETED.value,
                    "end_time": end_time,
                    "duration_seconds": duration,
                    "summary": summary,
                }
            },
        )

    # ─── Read ─────────────────────────────────────────────────────────────────

    async def get_by_call_sid(self, call_sid: str) -> Optional[Call]:
        doc = await self.col.find_one({"call_sid": call_sid})
        return _to_call(doc) if doc else None

    async def list_calls(
        self, skip: int = 0, limit: int = 50
    ) -> list[Call]:
        cursor = self.col.find().sort("start_time", -1).skip(skip).limit(limit)
        return [_to_call(d) async for d in cursor]

    async def get_active_calls(self) -> list[Call]:
        cursor = self.col.find({"status": CallStatus.IN_PROGRESS.value})
        return [_to_call(d) async for d in cursor]

    async def get_stats(self) -> dict:
        total = await self.col.count_documents({})
        completed = await self.col.count_documents(
            {"status": CallStatus.COMPLETED.value}
        )
        active = await self.col.count_documents(
            {"status": CallStatus.IN_PROGRESS.value}
        )
        pipeline = [
            {"$match": {"duration_seconds": {"$exists": True, "$gt": 0}}},
            {"$group": {"_id": None, "avg": {"$avg": "$duration_seconds"}}},
        ]
        agg = await self.col.aggregate(pipeline).to_list(1)
        avg_dur = round(agg[0]["avg"], 1) if agg else 0.0

        return {
            "total_calls": total,
            "completed_calls": completed,
            "active_calls": active,
            "avg_duration_seconds": avg_dur,
        }


def _to_call(doc: dict) -> Call:
    doc["_id"] = str(doc["_id"])
    return Call(**doc)
