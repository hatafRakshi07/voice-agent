"""
conversation_pipeline.py
─────────────────────────
Transport-agnostic AI voice conversation pipeline.

Orchestrates the full call flow:
  Raw audio (float32, 16 kHz, mono)
    ↓  VAD (WebRTC or Silero)
    ↓  Whisper STT
    ↓  Gemini / Ollama LLM  (streaming, sentence-by-sentence)
    ↓  Coqui XTTS-v2  (voice cloning)
    ↓  WAV bytes response

All stages are async.  The pipeline emits structured events that the
transport layer (WebSocket, AGI, etc.) can subscribe to.

Usage:
    pipeline = ConversationPipeline(session, whisper, llm, xtts)

    # Feed a float32 audio chunk (16 kHz mono)
    async for event in pipeline.feed_audio(audio_f32):
        if event["type"] == "audio_chunk":
            await ws.send_bytes(event["wav"])
        elif event["type"] == "transcript":
            print(event["text"])

    # Or process a text turn directly (for testing / text-mode)
    async for event in pipeline.process_text("Hello!"):
        ...
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional

import numpy as np

from app.memory.conversation_store import ConversationSession
from app.services.llm_service import LLMClient
from app.stt.whisper_engine import WhisperEngine
from app.tts.xtts_engine import XTTSEngine
from app.utils.logger import logger


class ConversationPipeline:
    """
    Reusable, transport-agnostic voice conversation pipeline.

    One instance per call / session.

    Events emitted (dicts):
      {"type": "vad_start"}                        — speech detected
      {"type": "vad_end"}                          — silence, utterance ready
      {"type": "transcript", "text": str}          — STT result
      {"type": "thinking"}                         — LLM inference starting
      {"type": "token", "token": str}              — raw LLM token
      {"type": "sentence", "text": str}            — complete sentence from LLM
      {"type": "audio_chunk", "wav": bytes}        — TTS WAV bytes for this sentence
      {"type": "done"}                             — response complete
      {"type": "error", "message": str}            — error in any stage
    """

    def __init__(
        self,
        session: ConversationSession,
        whisper: WhisperEngine,
        llm: LLMClient,
        xtts: XTTSEngine,
        temperature: float = 0.7,
        max_tokens: int = 400,
    ):
        self.session = session
        self.whisper = whisper
        self.llm = llm
        self.xtts = xtts
        self.temperature = temperature
        self.max_tokens = max_tokens

        # Silero VAD integration (optional — set by vad_service if enabled)
        self._silero_vad = None
        self.whisper.reset()

    # ── Public API ─────────────────────────────────────────────────────────────

    def set_silero_vad(self, vad) -> None:
        """Attach a loaded SileroVADEngine to override the built-in WebRTC VAD."""
        self._silero_vad = vad

    async def feed_audio(
        self, audio_f32: np.ndarray
    ) -> AsyncIterator[dict]:
        """
        Feed a float32 PCM chunk (16 kHz, mono) through VAD.

        Yields events as the chunk is processed.  If an utterance is
        detected (VAD detected silence after speech), runs the full
        STT → LLM → TTS pipeline and yields all resulting events.
        """
        # Use Silero VAD if attached
        if self._silero_vad is not None:
            utterance = self._silero_vad.process_chunk(audio_f32)
        else:
            utterance = self.whisper.process_chunk(audio_f32)

        if utterance is not None:
            yield {"type": "vad_end"}
            async for event in self._run_pipeline(utterance):
                yield event

    async def process_text(self, text: str) -> AsyncIterator[dict]:
        """
        Process a text input directly (skip VAD + STT stages).

        Useful for testing, text-mode clients, or DTMF-triggered inputs.
        """
        if not text.strip():
            return

        yield {"type": "transcript", "text": text}
        self.session.add_user(text)

        async for event in self._llm_tts_pipeline():
            yield event

    def reset_vad(self) -> None:
        """Reset VAD state (call after interruption or end of turn)."""
        self.whisper.reset()
        if self._silero_vad is not None:
            self._silero_vad.reset()

    # ── Internal pipeline stages ───────────────────────────────────────────────

    async def _run_pipeline(self, utterance: np.ndarray) -> AsyncIterator[dict]:
        """Run STT → LLM → TTS on a complete utterance."""
        # Stage 1: STT
        try:
            result = await self.whisper.transcribe(utterance)
            text = result["text"].strip()
        except Exception as exc:
            logger.error(f"[Pipeline] STT error: {exc}")
            yield {"type": "error", "message": f"STT error: {exc}"}
            return

        if not text:
            return

        yield {"type": "transcript", "text": text}
        self.session.add_user(text)

        # Stage 2: LLM → TTS
        async for event in self._llm_tts_pipeline():
            yield event

    async def _llm_tts_pipeline(self) -> AsyncIterator[dict]:
        """Run LLM inference + TTS synthesis, yielding events for each sentence."""
        yield {"type": "thinking"}
        full_response_parts: list[str] = []

        try:
            async for sentence in self.llm.stream_sentences(
                messages=self.session.get_messages(),
                system_prompt=self.session.system_prompt,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            ):
                full_response_parts.append(sentence)
                yield {"type": "sentence", "text": sentence}

                # TTS synthesis for this sentence
                if self.xtts.is_loaded:
                    try:
                        wav = await self.xtts.synthesize(
                            text=sentence,
                            voice_id=self.session.voice_id,
                            language=self.session.language,
                        )
                        yield {"type": "audio_chunk", "wav": wav}
                    except Exception as exc:
                        logger.warning(f"[Pipeline] TTS error for sentence: {exc}")

        except Exception as exc:
            logger.error(f"[Pipeline] LLM error: {exc}")
            yield {"type": "error", "message": f"LLM error: {exc}"}
            return

        # Save assistant turn to history
        assistant_text = " ".join(full_response_parts)
        if assistant_text:
            self.session.add_assistant(assistant_text)

        yield {"type": "done"}

    # ── Greeting helper ────────────────────────────────────────────────────────

    async def generate_greeting(self) -> AsyncIterator[dict]:
        """
        Generate the opening greeting without adding it to conversation history.
        Useful for call start.
        """
        from app.config import settings  # noqa: PLC0415

        greeting = (
            f"Hello! I'm {settings.AGENT_NAME}, your AI voice assistant. "
            "How can I help you today?"
        )
        yield {"type": "sentence", "text": greeting}

        if self.xtts.is_loaded:
            try:
                wav = await self.xtts.synthesize(
                    text=greeting,
                    voice_id=self.session.voice_id,
                    language=self.session.language,
                )
                yield {"type": "audio_chunk", "wav": wav}
            except Exception as exc:
                logger.warning(f"[Pipeline] Greeting TTS failed: {exc}")

        yield {"type": "done"}
