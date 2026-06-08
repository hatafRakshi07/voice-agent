"""
android_gateway.py
──────────────────
WebSocket + HTTP endpoints for the Android SIM gateway.

An Android phone running a SIM-gateway app (e.g. a custom companion app)
connects here when a call arrives on the SIM card.

──────────────────────────────────────────────────────────────────────────
HTTP endpoints (call lifecycle)
──────────────────────────────────────────────────────────────────────────
  POST  /api/android/call-start
        Body: {"caller_number": "+91xxxxxxxx", "secret": "..."}
        Returns: {"call_id": "...", "ws_url": "ws://.../ws/android/<call_id>"}

  POST  /api/android/call-end
        Body: {"call_id": "...", "secret": "..."}
        Returns: {"ok": true}

──────────────────────────────────────────────────────────────────────────
WebSocket endpoint
──────────────────────────────────────────────────────────────────────────
  WS  /ws/android/{call_id}
        Query param: secret=<ANDROID_GATEWAY_SECRET>

WebSocket protocol
──────────────────────────────────────────────────────────────────────────
Client → Server (JSON):
  {"type": "audio",  "data": "<base64 int16 PCM>",  "sample_rate": 16000}
  {"type": "dtmf",   "digit": "1"}
  {"type": "end"}

Client → Server (binary alternative):
  Raw int16 PCM bytes at 16000 Hz, mono (no JSON wrapper needed)

Server → Client (JSON):
  {"type": "ready"}
  {"type": "listening"}
  {"type": "transcript",   "text": "...", "is_final": true}
  {"type": "thinking"}
  {"type": "speaking",     "sentence": "..."}
  {"type": "audio_chunk",  "data": "<base64 WAV bytes>"}
  {"type": "done"}
  {"type": "error",        "message": "..."}

Server → Client (binary):
  Raw WAV bytes (16-bit PCM, 24 kHz, mono) — streamed sentence by sentence
──────────────────────────────────────────────────────────────────────────
"""

import asyncio
import base64
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.audio.processor import base64_to_float32, int16_to_float32, wav_bytes_to_base64
from app.config import settings
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository
from app.database.sqlite import get_db
from app.memory.conversation_store import ConversationSession
from app.models.call import Call, CallStatus
from app.models.conversation import ConversationTurn
from app.services.llm_service import get_llm_client
from app.stt.whisper_engine import get_whisper_engine
from app.tts.xtts_engine import get_xtts_engine
from app.utils.logger import logger

router = APIRouter()
ws_router = APIRouter()

# ── Request models ─────────────────────────────────────────────────────────────


class CallStartRequest(BaseModel):
    caller_number: str = "unknown"
    secret: str = ""


class CallEndRequest(BaseModel):
    call_id: str
    secret: str = ""


# ── Auth helper ────────────────────────────────────────────────────────────────


def _check_secret(provided: str) -> bool:
    """
    Validate the shared secret.
    Returns True if ANDROID_GATEWAY_SECRET is empty (open) or matches.
    """
    expected = settings.ANDROID_GATEWAY_SECRET
    if not expected:
        return True  # No auth configured — allow all
    return provided == expected


# ── HTTP lifecycle endpoints ───────────────────────────────────────────────────


@router.post("/call-start")
async def android_call_start(req: CallStartRequest):
    """
    Called by the Android app when an incoming call is answered.

    Returns a call_id and the WebSocket URL to connect for audio.
    """
    if not _check_secret(req.secret):
        raise HTTPException(status_code=403, detail="Invalid gateway secret")

    call_id = f"android_{uuid.uuid4().hex[:12]}"
    start_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        db = await get_db()
        repo = CallRepository(db)
        await repo.create(
            Call(
                call_id=call_id,
                phone_number=req.caller_number,
                direction="inbound",
                status=CallStatus.IN_PROGRESS,
                start_time=start_iso,
                voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
            )
        )
        logger.info(f"[Android] Call started: {call_id} from {req.caller_number}")
    except Exception as exc:
        logger.warning(f"[Android] DB write failed (non-fatal): {exc}")

    ws_url = f"{settings.BASE_URL.replace('http', 'ws')}/ws/android/{call_id}"
    if settings.ANDROID_GATEWAY_SECRET:
        ws_url += f"?secret={settings.ANDROID_GATEWAY_SECRET}"

    return {
        "call_id": call_id,
        "ws_url": ws_url,
        "message": "Call registered. Connect WebSocket to begin audio pipeline.",
    }


@router.post("/call-end")
async def android_call_end(req: CallEndRequest):
    """Called by the Android app when the call ends."""
    if not _check_secret(req.secret):
        raise HTTPException(status_code=403, detail="Invalid gateway secret")

    end_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        db = await get_db()
        repo = CallRepository(db)
        call = await repo.get_by_call_id(req.call_id)
        if call:
            start_ts = datetime.fromisoformat(call.start_time.replace("Z", "+00:00")).timestamp()
            duration = int(time.time() - start_ts)
            await repo.complete_call(
                call_id=req.call_id,
                end_time=end_iso,
                duration_seconds=duration,
            )
            logger.info(f"[Android] Call ended: {req.call_id} ({duration}s)")
    except Exception as exc:
        logger.warning(f"[Android] DB update failed (non-fatal): {exc}")

    return {"ok": True, "call_id": req.call_id}


# ── WebSocket audio pipeline ───────────────────────────────────────────────────


@ws_router.websocket("/{call_id}")
async def android_audio_websocket(
    websocket: WebSocket,
    call_id: str,
    secret: str = "",
):
    """
    Bidirectional WebSocket audio pipeline for the Android gateway.

    The Android app streams PCM audio; the server responds with WAV chunks.
    """
    if not _check_secret(secret):
        await websocket.close(code=4003, reason="Invalid gateway secret")
        return

    await websocket.accept()
    logger.info(f"[Android] WS connected for call {call_id}")

    # Load ML singletons
    whisper = get_whisper_engine(
        model_size=settings.WHISPER_MODEL,
        language=settings.WHISPER_LANGUAGE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )
    llm = get_llm_client()
    xtts = get_xtts_engine(default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None)

    # Per-call session
    session = ConversationSession(
        session_id=call_id,
        system_prompt=settings.AGENT_SYSTEM_PROMPT,
        voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
        language=settings.TTS_LANGUAGE,
    )
    whisper.reset()

    # DB repos (best-effort)
    try:
        db = await get_db()
        call_repo: Optional[CallRepository] = CallRepository(db)
        conv_repo: Optional[ConversationRepository] = ConversationRepository(db)
    except RuntimeError:
        call_repo = None
        conv_repo = None

    async def send_json(msg: dict) -> None:
        try:
            await websocket.send_text(json.dumps(msg))
        except Exception:
            pass

    async def send_wav(wav_bytes: bytes) -> None:
        """Send WAV audio as base64 JSON or raw binary."""
        try:
            await websocket.send_text(
                json.dumps({"type": "audio_chunk", "data": wav_bytes_to_base64(wav_bytes)})
            )
        except Exception:
            pass

    await send_json({"type": "ready"})
    await send_json({"type": "listening"})

    # Play greeting
    try:
        greeting = (
            f"Hello! I'm {settings.AGENT_NAME}, your AI voice assistant. "
            "How can I help you today?"
        )
        if xtts.is_loaded:
            wav = await xtts.synthesize(
                text=greeting,
                voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
                language=settings.TTS_LANGUAGE,
            )
            await send_json({"type": "speaking", "sentence": greeting})
            await send_wav(wav)
    except Exception as exc:
        logger.warning(f"[Android] Greeting failed: {exc}")

    _interrupted = False
    _is_speaking = False

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive(), timeout=60.0)
            except asyncio.TimeoutError:
                await send_json({"type": "status", "message": "keepalive"})
                continue

            # Handle binary PCM (int16, 16 kHz, mono)
            if "bytes" in raw and raw["bytes"]:
                pcm_bytes = raw["bytes"]
                audio_f32 = int16_to_float32(
                    np.frombuffer(pcm_bytes, dtype=np.int16)
                )
                utterance = whisper.process_chunk(audio_f32)
                if utterance is None:
                    continue
                await _handle_utterance(
                    utterance, whisper, llm, xtts, session,
                    call_repo, conv_repo, send_json, send_wav,
                )
                continue

            # Handle JSON messages
            if "text" not in raw or not raw["text"]:
                continue

            try:
                msg = json.loads(raw["text"])
            except json.JSONDecodeError:
                continue

            mtype = msg.get("type")

            if mtype == "audio":
                if _is_speaking:
                    continue
                try:
                    audio_f32 = base64_to_float32(msg["data"], dtype="float32")
                except Exception:
                    continue
                utterance = whisper.process_chunk(audio_f32)
                if utterance is None:
                    continue
                await _handle_utterance(
                    utterance, whisper, llm, xtts, session,
                    call_repo, conv_repo, send_json, send_wav,
                )

            elif mtype == "interrupt":
                _interrupted = True
                _is_speaking = False
                whisper.reset()
                await send_json({"type": "listening"})

            elif mtype == "end":
                break

            elif mtype == "dtmf":
                digit = msg.get("digit", "")
                logger.debug(f"[Android] DTMF: {digit}")

    except WebSocketDisconnect:
        logger.info(f"[Android] WS disconnected for call {call_id}")
    except Exception as exc:
        logger.error(f"[Android] WS error for call {call_id}: {exc}")
        await send_json({"type": "error", "message": str(exc)})
    finally:
        logger.info(f"[Android] Pipeline ended for call {call_id}")


# ── Utterance processing ───────────────────────────────────────────────────────


async def _handle_utterance(
    utterance: np.ndarray,
    whisper,
    llm,
    xtts,
    session: ConversationSession,
    call_repo,
    conv_repo,
    send_json,
    send_wav,
) -> None:
    """Run STT → LLM → TTS for one complete utterance."""
    # STT
    try:
        result = await whisper.transcribe(utterance)
        text = result["text"].strip()
    except Exception as exc:
        await send_json({"type": "error", "message": f"STT error: {exc}"})
        return

    if not text:
        await send_json({"type": "listening"})
        return

    await send_json({"type": "transcript", "text": text, "is_final": True})
    session.add_user(text)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if conv_repo:
        try:
            await conv_repo.add_turn(
                ConversationTurn(
                    call_id=session.session_id,
                    role="user",
                    content=text,
                    timestamp=ts,
                )
            )
        except Exception:
            pass

    # LLM → TTS streaming
    await send_json({"type": "thinking"})
    full_response: list[str] = []

    try:
        async for sentence in llm.stream_sentences(
            messages=session.get_messages(),
            system_prompt=session.system_prompt,
            temperature=0.7,
            max_tokens=400,
        ):
            full_response.append(sentence)
            await send_json({"type": "speaking", "sentence": sentence})

            if xtts.is_loaded:
                try:
                    wav = await xtts.synthesize(
                        text=sentence,
                        voice_id=session.voice_id,
                        language=session.language,
                    )
                    await send_wav(wav)
                except Exception as exc:
                    logger.warning(f"[Android] TTS error: {exc}")

    except Exception as exc:
        logger.error(f"[Android] LLM error: {exc}")
        await send_json({"type": "error", "message": f"LLM error: {exc}"})
        return

    assistant_text = " ".join(full_response)
    session.add_assistant(assistant_text)

    if conv_repo:
        try:
            await conv_repo.add_turn(
                ConversationTurn(
                    call_id=session.session_id,
                    role="assistant",
                    content=assistant_text,
                    timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                )
            )
        except Exception:
            pass

    if call_repo:
        try:
            await call_repo.increment_turn_count(session.session_id)
        except Exception:
            pass

    await send_json({"type": "done"})
    await send_json({"type": "listening"})
