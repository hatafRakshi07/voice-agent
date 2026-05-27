from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json

from app.database.mongodb import get_db
from app.database.repositories.call_repository import CallRepository

router = APIRouter()


@router.get("/stats")
async def get_stats():
    """Return aggregate call statistics for the dashboard."""
    db = await get_db()
    repo = CallRepository(db)
    return await repo.get_stats()


@router.get("/live-events")
async def live_events():
    """Server-Sent Events stream — pushes active-call count every 3 s."""

    async def event_generator():
        while True:
            try:
                db = await get_db()
                repo = CallRepository(db)
                stats = await repo.get_stats()
                data = json.dumps(stats)
                yield f"data: {data}\n\n"
            except Exception:
                yield "data: {}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
