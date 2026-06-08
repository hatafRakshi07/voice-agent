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
from app.memory.conversation_store import get_conversation_store
from app.services.llm_service import get_llm_client
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
    llm = get_llm_client()
    xtts = get_xtts_engine(
        default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
    )
    return whisper, llm, xtts


# ── WebSocket voice endpoint ───────────────────────────────────────────────────

@router.websocket("/voice")
async def voice_websocket(websocket: WebSocket):
    """
    Browser WebSocket endpoint for full-duplex AI voice conversation.

    Each connection gets its own AudioPipeline instance with isolated
    VAD state and conversation history.
    """
    store = get_conversation_store()
    whisper, llm, xtts = _get_services()

    # Create a new session for this connection
    session = await store.create_session(
        system_prompt=settings.AGENT_SYSTEM_PROMPT,
        language=settings.TTS_LANGUAGE,
    )

    pipeline = AudioPipeline(
        session=session,
        whisper=whisper,
        ollama=llm,
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
    """Return model readiness for all AI components (provider-aware)."""
    from app.llm.gemini_client import GeminiClient  # noqa: PLC0415
    from app.llm.ollama_client import OllamaClient  # noqa: PLC0415

    whisper, llm, xtts = _get_services()
    provider = settings.LLM_PROVIDER.lower()

    # Build provider-specific status block
    if provider == "gemini" or isinstance(llm, GeminiClient):
        llm_ok = await llm.is_available()
        llm_status = {
            "provider": "gemini",
            "ready": llm_ok,
            "model": settings.GEMINI_MODEL,
            "api_key_set": bool(settings.GEMINI_API_KEY),
        }
        # Keep ollama block with zeros for backward compat
        ollama_status = {
            "ready": False,
            "host": settings.OLLAMA_HOST,
            "model": settings.OLLAMA_MODEL,
            "available_models": [],
        }
    else:
        ollama_ok = await llm.is_available()
        ollama_models = await llm.list_models() if ollama_ok else []
        llm_status = {
            "provider": "ollama",
            "ready": ollama_ok,
            "model": settings.OLLAMA_MODEL,
            "host": settings.OLLAMA_HOST,
        }
        ollama_status = {
            "ready": ollama_ok,
            "host": settings.OLLAMA_HOST,
            "model": settings.OLLAMA_MODEL,
            "available_models": ollama_models,
        }

    return {
        "whisper": {
            "ready": whisper.is_loaded,
            "model": settings.WHISPER_MODEL,
            "device": settings.WHISPER_DEVICE,
        },
        "xtts": {
            "ready": xtts.is_loaded,
        },
        "llm": llm_status,
        # ollama key preserved for backward compatibility with frontend
        "ollama": ollama_status,
        "telephony_provider": settings.TELEPHONY_PROVIDER,
        "vad": "silero" if settings.USE_SILERO_VAD else "webrtc",
    }


@router.get("/sessions")
async def get_sessions():
    """Return count of active voice sessions."""
    store = get_conversation_store()
    await store.prune_stale()
    return {"active_sessions": store.active_count}
