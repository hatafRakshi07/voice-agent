from fastapi import APIRouter, HTTPException, Query

from app.database.sqlite import get_db
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository

router = APIRouter()


@router.get("")
async def list_calls(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    """Return paginated list of calls (newest first)."""
    try:
        db = await get_db()
    except RuntimeError:
        return []
    repo = CallRepository(db)
    calls = await repo.list_calls(skip=skip, limit=limit)
    return [c.model_dump() for c in calls]


@router.get("/active")
async def list_active_calls():
    """Return all currently active calls."""
    try:
        db = await get_db()
    except RuntimeError:
        return []
    repo = CallRepository(db)
    calls = await repo.get_active_calls()
    return [c.model_dump() for c in calls]


@router.get("/{call_id}")
async def get_call(call_id: str):
    """Return a single call record."""
    try:
        db = await get_db()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    repo = CallRepository(db)
    call = await repo.get_by_call_id(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call.model_dump()


@router.get("/{call_id}/conversation")
async def get_conversation(call_id: str):
    """Return full conversation transcript for a call."""
    try:
        db = await get_db()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    call_repo = CallRepository(db)
    conv_repo = ConversationRepository(db)

    call = await call_repo.get_by_call_id(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    turns = await conv_repo.get_by_call_id(call_id)
    return {
        "call_id": call_id,
        "summary": call.summary,
        "turns": [t.model_dump() for t in turns],
    }