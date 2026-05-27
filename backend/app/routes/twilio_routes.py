"""
twilio_routes.py
────────────────
Twilio webhook endpoints:
  POST /api/twilio/voice          — incoming call (TwiML response)
  WS   /api/twilio/stream/{sid}  — Media Stream WebSocket
  POST /api/twilio/status         — call-status callbacks
"""

import asyncio

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from app.config import settings
from app.database.mongodb import get_db
from app.database.repositories.call_repository import CallRepository
from app.models.call import Call, CallStatus
from app.services.call_handler import CallHandler
from app.services.stt_service import STTService
from app.services.llm_service import LLMService
from app.services.tts_factory import get_tts_service
from app.utils.logger import logger

router = APIRouter()

# ── Shared service singletons (created once at startup) ──────────────────────
_stt = STTService(settings.DEEPGRAM_API_KEY)
_llm = LLMService(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)

# Active call handlers keyed by call_sid
active_calls: dict[str, CallHandler] = {}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/twilio/voice
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/voice")
async def handle_incoming_call(request: Request):
    """Twilio webhook — respond with TwiML to open a Media Stream."""
    form = await request.form()
    call_sid: str = form.get("CallSid", "")
    from_number: str = form.get("From", "unknown")
    to_number: str = form.get("To", settings.TWILIO_PHONE_NUMBER)

    logger.info(f"[CALL] Incoming {call_sid} from {from_number}")

    # Persist initial call record
    try:
        db = await get_db()
        repo = CallRepository(db)
        await repo.update_status(
            call_sid,
            CallStatus.RINGING,
            from_number=from_number,
            to_number=to_number,
        )
    except Exception as exc:
        logger.warning(f"DB write on incoming call failed: {exc}")

    # Derive WebSocket URL (wss://<host>/api/twilio/stream/<call_sid>)
    host = request.headers.get("host", settings.BASE_URL.replace("https://", ""))
    ws_url = f"wss://{host}/api/twilio/stream/{call_sid}"

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<Stream url="{ws_url}" />'
        "</Connect>"
        "</Response>"
    )
    return Response(content=twiml, media_type="application/xml")


# ─────────────────────────────────────────────────────────────────────────────
# WS /api/twilio/stream/{call_sid}
# ─────────────────────────────────────────────────────────────────────────────
@router.websocket("/stream/{call_sid}")
async def handle_media_stream(websocket: WebSocket, call_sid: str):
    """Twilio Media Stream WebSocket — bidirectional audio pipeline."""
    db = await get_db()
    call_repo = CallRepository(db)

    handler = CallHandler(
        call_sid=call_sid,
        stt_service=_stt,
        llm_service=_llm,
        tts_service=get_tts_service(),
        call_repo=call_repo,
    )
    active_calls[call_sid] = handler

    try:
        await handler.handle_websocket(websocket)
    except WebSocketDisconnect:
        logger.info(f"[{call_sid}] WebSocket disconnected by client")
    except Exception as exc:
        logger.error(f"[{call_sid}] Unhandled error: {exc}")
    finally:
        active_calls.pop(call_sid, None)
        await handler.on_call_ended()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/twilio/status
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/status")
async def call_status_callback(request: Request):
    """Twilio status-change callback (no-auth in dev; add validation in prod)."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    status = form.get("CallStatus", "")
    logger.info(f"[{call_sid}] Status: {status}")
    return Response(status_code=204)
