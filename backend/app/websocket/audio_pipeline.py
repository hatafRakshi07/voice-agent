"""
audio_pipeline.py
──────────────────
Real-time voice conversation pipeline for a single browser WebSocket session.

Flow:
  Browser Mic (float32 PCM, 16 kHz)
    → WhisperEngine (VAD + STT)
    → OllamaClient  (LLM, streaming)
    → XTTSEngine    (voice-cloned TTS, sentence-by-sentence)
    → Browser       (WAV chunks over WebSocket)

WebSocket message protocol
──────────────────────────
Client → Server  (JSON):
  {"type": "config",    "voice_id": "local_xxx", "language": "en"}
  {"type": "audio",     "data": "<base64 float32>", "sample_rate": 16000}
  {"type": "interrupt"}
  {"type": "end"}

Server → Client  (JSON):
  {"type": "ready"}
  {"type": "listening"}
  {"type": "transcript",      "text": "...", "is_final": bool}
  {"type": "thinking"}
  {"type": "response_token",  "token": "..."}
  {"type": "speaking",        "sentence": "..."}
  {"type": "audio_chunk",     "data": "<base64 WAV bytes>"}
  {"type": "done"}
  {"type": "error",           "message": "..."}
  {"type": "status",          "message": "..."}
"""

import asyncio
import base64
import json
import time
from typing import Optional

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from app.audio.processor import base64_to_float32, wav_bytes_to_base64
from app.config import settings
from app.memory.conversation_store import ConversationSession
from app.services.llm_service import LLMClient
from app.stt.whisper_engine import WhisperEngine
from app.tts.xtts_engine import XTTSEngine
from app.utils.logger import logger


class AudioPipeline:
    """
    Manages a single browser WebSocket session end-to-end.

    One instance per connected client.
    """

    def __init__(
        self,
        session: ConversationSession,
        whisper: WhisperEngine,
        ollama: LLMClient,
        xtts: XTTSEngine,
    ):
        self.session = session
        self.whisper = whisper
        self.ollama = ollama
        self.xtts = xtts

        self.websocket: Optional[WebSocket] = None

        # State flags
        self._is_speaking = False   # TTS is currently playing on client
        self._interrupted = False   # User interrupted during TTS
        self._running = False

        # Soft-copy of per-session VAD state
        self.whisper.reset()

    # ── Entry point ────────────────────────────────────────────────────────────

    async def run(self, websocket: WebSocket) -> None:
        """Accept the WebSocket and drive the full conversation loop."""
        await websocket.accept()
        self.websocket = websocket
        self._running = True

        await self._send({"type": "ready"})
        await self._send({"type": "listening"})

        try:
            while self._running:
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                await self._dispatch(msg)
        except WebSocketDisconnect:
            logger.info(f"[Pipeline] {self.session.session_id} disconnected")
        except Exception as exc:
            logger.error(f"[Pipeline] Error: {exc}")
            await self._safe_send({"type": "error", "message": str(exc)})
        finally:
            self._running = False

    # ── Message dispatching ────────────────────────────────────────────────────

    async def _dispatch(self, msg: dict) -> None:
        mtype = msg.get("type")

        if mtype == "audio":
            await self._handle_audio(msg)

        elif mtype == "config":
            voice_id = msg.get("voice_id")
            language = msg.get("language", "en")
            if voice_id:
                self.session.voice_id = voice_id
            self.session.language = language
            await self._send({"type": "status", "message": "Config updated"})

        elif mtype == "interrupt":
            self._interrupted = True
            self._is_speaking = False
            self.whisper.reset()
            await self._send({"type": "listening"})

        elif mtype == "end":
            self._running = False

    # ── Audio processing ───────────────────────────────────────────────────────

    async def _handle_audio(self, msg: dict) -> None:
        """Process incoming audio chunk through VAD → STT."""
        # Don't process audio while TTS is playing (unless interrupted)
        if self._is_speaking and not self._interrupted:
            return

        try:
            audio_f32 = base64_to_float32(msg["data"], dtype="float32")
        except Exception as exc:
            logger.warning(f"[Pipeline] Bad audio chunk: {exc}")
            return

        # Feed to VAD — returns utterance only when silence detected
        utterance = self.whisper.process_chunk(audio_f32)
        if utterance is None:
            return

        # Got a complete utterance — transcribe it
        await self._send({"type": "status", "message": "Transcribing…"})
        try:
            result = await self.whisper.transcribe(utterance)
            text = result["text"].strip()
        except Exception as exc:
            logger.error(f"[Pipeline] STT error: {exc}")
            await self._send({"type": "error", "message": f"STT failed: {exc}"})
            return

        if not text:
            await self._send({"type": "listening"})
            return

        await self._send({"type": "transcript", "text": text, "is_final": True})
        self.session.add_user(text)

        # LLM → TTS pipeline
        await self._respond(text)

    # ── LLM + TTS pipeline ─────────────────────────────────────────────────────

    async def _respond(self, user_text: str) -> None:
        """Run LLM inference and stream TTS response back to the client."""
        await self._send({"type": "thinking"})
        self._interrupted = False
        self._is_speaking = False

        full_response_parts: list[str] = []

        try:
            async for sentence in self.ollama.stream_sentences(
                messages=self.session.get_messages(),
                system_prompt=self.session.system_prompt,
                temperature=0.7,
                max_tokens=400,
            ):
                if self._interrupted:
                    break

                # Stream LLM tokens back for display
                await self._send({"type": "response_token", "token": sentence + " "})
                full_response_parts.append(sentence)

                # Synthesise and stream TTS for this sentence
                await self._synthesize_and_stream(sentence)

                if self._interrupted:
                    break

        except Exception as exc:
            logger.error(f"[Pipeline] LLM error: {exc}")
            await self._safe_send({"type": "error", "message": f"LLM failed: {exc}"})

        # Save full response to conversation memory
        if full_response_parts:
            full_response = " ".join(full_response_parts)
            self.session.add_assistant(full_response)

        if not self._interrupted:
            await self._send({"type": "done"})
            self._is_speaking = False
        await self._send({"type": "listening"})

    async def _synthesize_and_stream(self, sentence: str) -> None:
        """Synthesise one sentence and stream WAV chunks to the client."""
        self._is_speaking = True
        await self._send({"type": "speaking", "sentence": sentence})

        try:
            async for chunk in self.xtts.stream(
                text=sentence,
                voice_id=self.session.voice_id,
                language=self.session.language,
            ):
                if self._interrupted:
                    return
                await self._send(
                    {
                        "type": "audio_chunk",
                        "data": wav_bytes_to_base64(chunk),
                    }
                )
        except Exception as exc:
            logger.error(f"[Pipeline] TTS error: {exc}")
            await self._safe_send({"type": "error", "message": f"TTS failed: {exc}"})

        self._is_speaking = False

    # ── WebSocket helpers ──────────────────────────────────────────────────────

    async def _send(self, payload: dict) -> None:
        if self.websocket:
            await self.websocket.send_text(json.dumps(payload))

    async def _safe_send(self, payload: dict) -> None:
        try:
            await self._send(payload)
        except Exception:
            pass
