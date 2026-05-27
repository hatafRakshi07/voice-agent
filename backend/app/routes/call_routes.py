from fastapi import APIRouter, HTTPException, Query

from app.database.mongodb import get_db
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository

router = APIRouter()


@router.get("")
async def list_calls(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    """Return paginated list of calls (newest first)."""
    db = await get_db()
    repo = CallRepository(db)
    calls = await repo.list_calls(skip=skip, limit=limit)
    return [c.model_dump(by_alias=False) for c in calls]


@router.get("/active")
async def list_active_calls():
    """Return all currently active calls."""
    db = await get_db()
    repo = CallRepository(db)
    calls = await repo.get_active_calls()
    return [c.model_dump(by_alias=False) for c in calls]


@router.get("/{call_sid}")
async def get_call(call_sid: str):
    """Return a single call record."""
    db = await get_db()
    repo = CallRepository(db)
    call = await repo.get_by_call_sid(call_sid)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call.model_dump(by_alias=False)


@router.get("/{call_sid}/conversation")
async def get_conversation(call_sid: str):
    """Return full conversation transcript for a call."""
    db = await get_db()
    conv_repo = ConversationRepository(db)
    call_repo = CallRepository(db)

    call = await call_repo.get_by_call_sid(call_sid)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    turns = await conv_repo.get_by_call_sid(call_sid)
    return {
        "call_sid": call_sid,
        "summary": call.summary,
        "turns": [t.model_dump(by_alias=False) for t in turns],
    }
