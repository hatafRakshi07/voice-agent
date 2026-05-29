"""
ws_routes.py
────────────
WebSocket endpoint for browser-based voice conversation.

  WS  /ws/voice          — real-time voice pipeline per session
  GET /ws/status         — model readiness status
  GET /ws/sessions       — active session count
"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.llm.ollama_client import get_ollama_client
from app.memory.conversation_store import get_conversation_store
from app.stt.whisper_engine import get_whisper_engine
from app.tts.xtts_engine import get_xtts_engine
from app.utils.logger import logger
from app.websocket.audio_pipeline import AudioPipeline

router = APIRouter()


def _get_services():
    """Return shared service singletons (loaded once at startup)."""
    whisper = get_whisper_engine(
        model_size=settings.WHISPER_MODEL,
        language=settings.WHISPER_LANGUAGE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )
    ollama = get_ollama_client(
        host=settings.OLLAMA_HOST,
        model=settings.OLLAMA_MODEL,
    )
    xtts = get_xtts_engine(
        default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
    )
    return whisper, ollama, xtts


# ── WebSocket voice endpoint ───────────────────────────────────────────────────

@router.websocket("/voice")
async def voice_websocket(websocket: WebSocket):
    """
    Browser WebSocket endpoint for full-duplex AI voice conversation.

    Each connection gets its own AudioPipeline instance with isolated
    VAD state and conversation history.
    """
    store = get_conversation_store()
    whisper, ollama, xtts = _get_services()

    # Create a new session for this connection
    session = await store.create_session(
        system_prompt=settings.AGENT_SYSTEM_PROMPT,
        language=settings.TTS_LANGUAGE,
    )

    pipeline = AudioPipeline(
        session=session,
        whisper=whisper,
        ollama=ollama,
        xtts=xtts,
    )

    logger.info(f"[WS] New voice session: {session.session_id}")

    try:
        await pipeline.run(websocket)
    except WebSocketDisconnect:
        logger.info(f"[WS] Session {session.session_id} disconnected")
    except Exception as exc:
        logger.error(f"[WS] Session {session.session_id} error: {exc}")
    finally:
        await store.delete_session(session.session_id)
        logger.info(f"[WS] Session {session.session_id} cleaned up")


# ── REST status endpoints ──────────────────────────────────────────────────────

@router.get("/status")
async def get_status():
    """Return model readiness for all local AI components."""
    whisper, ollama, xtts = _get_services()
    ollama_ok = await ollama.is_available()
    ollama_models = await ollama.list_models() if ollama_ok else []

    return {
        "whisper": {
            "ready": whisper.is_loaded,
            "model": settings.WHISPER_MODEL,
            "device": settings.WHISPER_DEVICE,
        },
        "xtts": {
            "ready": xtts.is_loaded,
        },
        "ollama": {
            "ready": ollama_ok,
            "host": settings.OLLAMA_HOST,
            "model": settings.OLLAMA_MODEL,
            "available_models": ollama_models,
        },
    }


@router.get("/sessions")
async def get_sessions():
    """Return count of active voice sessions."""
    store = get_conversation_store()
    await store.prune_stale()
    return {"active_sessions": store.active_count}
