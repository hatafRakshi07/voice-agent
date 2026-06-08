from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json

from app.database.sqlite import get_db
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository

router = APIRouter()

_EMPTY_STATS = {
    "total_calls": 0,
    "completed_calls": 0,
    "active_calls": 0,
    "avg_duration_seconds": 0,
}


@router.get("/stats")
async def get_stats():
    """Return aggregate call statistics."""
    try:
        db = await get_db()
    except RuntimeError:
        return _EMPTY_STATS
    return await CallRepository(db).get_stats()


@router.get("/analytics")
async def get_analytics(days: int = 30):
    """Return per-day call counts + common user phrases for the last N days."""
    try:
        db = await get_db()
    except RuntimeError:
        return {"daily": [], "common_phrases": []}

    call_repo = CallRepository(db)
    conv_repo = ConversationRepository(db)

    daily = await call_repo.get_daily_stats(days=days)
    phrases = await conv_repo.get_common_phrases(limit=10)

    return {"daily": daily, "common_phrases": phrases}


@router.get("/live-events")
async def live_events():
    """Server-Sent Events stream - pushes stats every 5 s."""

    async def event_generator():
        while True:
            try:
                db = await get_db()
                stats = await CallRepository(db).get_stats()
                data = json.dumps(stats)
            except RuntimeError:
                data = json.dumps(_EMPTY_STATS)
            except Exception:
                data = "{}"
            yield f"data: {data}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )