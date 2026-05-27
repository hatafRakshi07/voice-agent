"""
call_handler.py
───────────────
Central orchestrator for a single phone call.

Flow:
  Twilio Media Stream (WebSocket)
    → μ-law 8 kHz audio bytes → Deepgram (STT)
    → final transcript → GPT-4o (LLM)
    → response text → ElevenLabs (TTS, ulaw_8000 stream)
    → audio chunks → Twilio Media Stream (WebSocket)

Interruption handling:
  While the agent is speaking, incoming audio energy is monitored.
  If sustained speech is detected the current TTS stream is aborted
  and Twilio's audio buffer is flushed with a "clear" event.
"""

import asyncio
import json
import base64
import time
from typing import Optional

from fastapi import WebSocket

from app.config import settings
from app.services.stt_service import STTService
from app.services.llm_service import LLMService
from app.services.tts_service import TTSService
from app.services.context_manager import ConversationContext
from app.models.call import Call, CallStatus
from app.models.conversation import ConversationTurn
from app.database.mongodb import get_db
from app.database.repositories.call_repository import CallRepository
from app.database.repositories.conversation_repository import ConversationRepository
from app.utils.logger import logger

# Silence byte value in μ-law encoding
_MULAW_SILENCE = 0xFF
# Fraction of non-silence bytes that triggers interruption detection
_INTERRUPT_THRESHOLD = 0.30
# Consecutive "active" media packets before we fire interruption
_INTERRUPT_PACKETS = 3


class CallHandler:
    def __init__(
        self,
        call_sid: str,
        stt_service: STTService,
        llm_service: LLMService,
        tts_service: TTSService,
        call_repo: CallRepository,
    ):
        self.call_sid = call_sid
        self.stream_sid: Optional[str] = None
        self.websocket: Optional[WebSocket] = None

        # Services
        self.stt = stt_service
        self.llm = llm_service
        self.tts = tts_service

        # Conversation memory
        self.context = ConversationContext(
            system_prompt=settings.AGENT_SYSTEM_PROMPT,
            max_turns=settings.MAX_CONVERSATION_TURNS,
        )

        # DB repos (resolved lazily to avoid blocking startup)
        self.call_repo = call_repo
        self._conv_repo: Optional[ConversationRepository] = None

        # State
        self.dg_connection = None
        self.is_agent_speaking = False
        self._interrupt_flag = False
        self._consecutive_active_packets = 0

        # Voice
        self.voice_id: str = settings.ELEVENLABS_DEFAULT_VOICE_ID

        # Metrics
        self.from_number = "unknown"

    # ─── Lifecycle ───────────────────────────────────────────────────────────

    async def handle_websocket(self, websocket: WebSocket):
        """Accept and drive the Twilio Media Stream WebSocket."""
        await websocket.accept()
        self.websocket = websocket

        # Open Deepgram connection
        self.dg_connection = await self.stt.create_connection(
            on_final=self._on_transcript_final,
            on_interim=self._on_transcript_interim,
        )

        logger.info(f"[{self.call_sid}] WebSocket ready")


        try:
            while True:
                raw = await websocket.receive_text()
                await self._dispatch(json.loads(raw))
        except Exception as exc:
            logger.warning(f"[{self.call_sid}] WebSocket ended: {exc}")
        finally:
            if self.dg_connection:
                try:
                    await self.dg_connection.finish()
                except Exception:
                    pass

    async def on_call_ended(self):
        """Persist final call state and generate a summary."""
        try:
            messages = self.context.get_messages()
            summary = None
            if messages:
                summary = await self.llm.generate_summary(messages)
            await self.call_repo.complete_call(self.call_sid, summary=summary)
            logger.info(
                f"[{self.call_sid}] Call ended — {self.context.turn_count} turns"
            )
        except Exception as exc:
            logger.error(f"[{self.call_sid}] on_call_ended error: {exc}")

    # ─── Twilio message dispatching ──────────────────────────────────────────

    async def _dispatch(self, msg: dict):
        event = msg.get("event")

        if event == "connected":
            logger.debug(f"[{self.call_sid}] Twilio: connected")

        elif event == "start":
            await self._on_stream_start(msg["start"])

        elif event == "media":
            await self._on_media(msg["media"])

        elif event == "stop":
            logger.info(f"[{self.call_sid}] Twilio: stop")
            raise StopAsyncIteration

        elif event == "dtmf":
            digit = msg.get("dtmf", {}).get("digit", "")
            logger.debug(f"[{self.call_sid}] DTMF: {digit}")

    async def _on_stream_start(self, start: dict):
        self.stream_sid = start["streamSid"]
        meta = start.get("customParameters", {})
        self.from_number = start.get("from", meta.get("from", "unknown"))

        logger.info(
            f"[{self.call_sid}] Stream started — sid={self.stream_sid} "
            f"from={self.from_number}"
        )

        await self.call_repo.update_status(self.call_sid, CallStatus.IN_PROGRESS)

        # Greet the caller asynchronously (short delay for call setup)
        asyncio.create_task(self._send_greeting())

    async def _on_media(self, media: dict):
        audio_bytes = base64.b64decode(media["payload"])

        # ── Interruption detection ────────────────────────────────────────
        if self.is_agent_speaking:
            non_silent = sum(
                1 for b in audio_bytes if b != _MULAW_SILENCE and b != 0x7F
            )
            if non_silent / max(len(audio_bytes), 1) > _INTERRUPT_THRESHOLD:
                self._consecutive_active_packets += 1
                if self._consecutive_active_packets >= _INTERRUPT_PACKETS:
                    await self._handle_interruption()
                    self._consecutive_active_packets = 0
            else:
                self._consecutive_active_packets = 0

        # ── Forward to Deepgram ───────────────────────────────────────────
        if self.dg_connection:
            try:
                await self.dg_connection.send(audio_bytes)
            except Exception as exc:
                logger.warning(f"[{self.call_sid}] Deepgram send error: {exc}")

    # ─── Speech recognition callbacks ────────────────────────────────────────

    async def _on_transcript_final(self, transcript: str, confidence: float):
        if not transcript.strip():
            return

        logger.info(f"[{self.call_sid}] USER: {transcript!r}")
        turn_start = time.monotonic()

        # Memory
        self.context.add_user_message(transcript)

        # Persist user turn
        await self._save_turn("user", transcript, confidence=confidence)

        # LLM response
        response_text = await self.llm.get_response(
            messages=self.context.get_messages(),
            system_prompt=self.context.system_prompt,
        )

        latency_ms = int((time.monotonic() - turn_start) * 1000)
        logger.info(f"[{self.call_sid}] AGENT: {response_text!r} ({latency_ms}ms)")

        # Memory
        self.context.add_assistant_message(response_text)

        # Persist assistant turn
        await self._save_turn("assistant", response_text, latency_ms=latency_ms)

        # TTS → Twilio
        asyncio.create_task(self._send_audio_response(response_text))

    async def _on_transcript_interim(self, transcript: str):
        logger.debug(f"[{self.call_sid}] INTERIM: {transcript!r}")

    # ─── Audio output ─────────────────────────────────────────────────────────

    async def _send_greeting(self):
        await asyncio.sleep(0.6)
        greeting = (
            f"Hello! Thanks for calling. I'm {settings.AGENT_NAME}, "
            "your AI assistant. How can I help you today?"
        )
        await self._send_audio_response(greeting)

    async def _send_audio_response(self, text: str):
        if not self.websocket or not self.stream_sid:
            return

        self.is_agent_speaking = True
        self._interrupt_flag = False
        self._consecutive_active_packets = 0

        try:
            async for chunk in self.tts.stream(text, self.voice_id):
                if self._interrupt_flag:
                    logger.info(f"[{self.call_sid}] TTS interrupted")
                    break
                if chunk:
                    payload = base64.b64encode(chunk).decode()
                    await self.websocket.send_text(
                        json.dumps({
                            "event": "media",
                            "streamSid": self.stream_sid,
                            "media": {"payload": payload},
                        })
                    )
        except Exception as exc:
            logger.error(f"[{self.call_sid}] TTS stream error: {exc}")
        finally:
            self.is_agent_speaking = False

    # ─── Interruption ─────────────────────────────────────────────────────────

    async def _handle_interruption(self):
        if self._interrupt_flag:
            return
        logger.info(f"[{self.call_sid}] Interruption detected")
        self._interrupt_flag = True

        # Flush Twilio's audio playback buffer
        if self.websocket and self.stream_sid:
            try:
                await self.websocket.send_text(
                    json.dumps({"event": "clear", "streamSid": self.stream_sid})
                )
            except Exception:
                pass

    # ─── DB helpers ───────────────────────────────────────────────────────────

    async def _get_conv_repo(self) -> ConversationRepository:
        if self._conv_repo is None:
            db = await get_db()
            self._conv_repo = ConversationRepository(db)
        return self._conv_repo

    async def _save_turn(
        self,
        role: str,
        content: str,
        confidence: float = 1.0,
        latency_ms: int = 0,
    ):
        try:
            repo = await self._get_conv_repo()
            await repo.add_turn(
                ConversationTurn(
                    call_sid=self.call_sid,
                    role=role,
                    content=content,
                    confidence=confidence if role == "user" else None,
                    latency_ms=latency_ms if role == "assistant" else None,
                )
            )
        except Exception as exc:
            logger.warning(f"[{self.call_sid}] DB save turn error: {exc}")
