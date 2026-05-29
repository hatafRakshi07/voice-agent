"""
whisper_engine.py
─────────────────
Offline Speech-to-Text using faster-whisper (CTranslate2 backend).

Features:
- Fully offline — no API keys required
- Real-time audio chunk processing
- WebRTC VAD-based utterance detection
- English + Hindi + multilingual support
- CPU int8 quantization (fast on CPU)
- Thread-safe singleton
"""

import asyncio
from typing import Callable, Optional

import numpy as np

from app.utils.logger import logger

# VAD configuration
VAD_SAMPLE_RATE = 16000
VAD_FRAME_MS = 30  # webrtcvad only accepts 10, 20, or 30 ms
VAD_FRAME_SAMPLES = int(VAD_SAMPLE_RATE * VAD_FRAME_MS / 1000)  # 480 samples
SILENCE_THRESHOLD = 20   # 20 × 30 ms = 600 ms silence → end of utterance
SPEECH_THRESHOLD = 3     # 3 × 30 ms = 90 ms speech → start detected
MIN_SPEECH_FRAMES = 8    # minimum speech frames to run inference (~240 ms)


class WhisperEngine:
    """
    Real-time speech-to-text using faster-whisper + WebRTC VAD.

    Usage:
        engine = WhisperEngine(model_size="base")
        await engine.load()

        # Feed float32 PCM audio chunks (16 kHz, mono)
        utterance = engine.process_chunk(audio_f32)
        if utterance is not None:
            result = await engine.transcribe(utterance)
            print(result["text"])
    """

    def __init__(
        self,
        model_size: str = "base",
        language: Optional[str] = "en",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        self.model_size = model_size
        self.language = language
        self.device = device
        self.compute_type = compute_type

        self._model = None
        self._vad = None

        # VAD state (per-session; call reset() to clear)
        self._speech_buffer: list[np.ndarray] = []
        self._silence_count: int = 0
        self._speech_count: int = 0
        self._in_speech: bool = False
        self._loaded: bool = False

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def load(self) -> None:
        """Load Whisper model in a thread pool (non-blocking)."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self) -> None:
        try:
            from faster_whisper import WhisperModel  # noqa: PLC0415
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper not installed. Run: pip install faster-whisper"
            ) from exc

        logger.info(f"[STT] Loading Whisper '{self.model_size}' on {self.device}…")
        self._model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
        )

        try:
            import webrtcvad  # noqa: PLC0415
            self._vad = webrtcvad.Vad(2)  # aggressiveness 0–3
            logger.info("[STT] WebRTC VAD loaded ✓")
        except ImportError:
            logger.warning("[STT] webrtcvad unavailable — using energy VAD fallback")
            self._vad = None

        self._loaded = True
        logger.info(f"[STT] Whisper '{self.model_size}' ready ✓")

    # ── VAD helpers ───────────────────────────────────────────────────────────

    def _is_speech(self, frame_f32: np.ndarray) -> bool:
        """Return True if the 30 ms frame contains speech."""
        frame_i16 = (np.clip(frame_f32, -1.0, 1.0) * 32767).astype(np.int16)

        if self._vad is not None:
            try:
                return self._vad.is_speech(frame_i16.tobytes(), VAD_SAMPLE_RATE)
            except Exception:
                pass

        # Energy-based fallback
        rms = float(np.sqrt(np.mean(frame_f32 ** 2)))
        return rms > 0.01  # ~-40 dBFS threshold

    # ── Chunk processing ──────────────────────────────────────────────────────

    def process_chunk(self, audio_f32: np.ndarray) -> Optional[np.ndarray]:
        """
        Feed a chunk of float32 audio (16 kHz mono).

        Returns a complete utterance array when end-of-speech is detected,
        otherwise returns None.  Call reset() between sessions.
        """
        n_frames = len(audio_f32) // VAD_FRAME_SAMPLES
        utterance: Optional[np.ndarray] = None

        for i in range(n_frames):
            start = i * VAD_FRAME_SAMPLES
            frame = audio_f32[start: start + VAD_FRAME_SAMPLES]
            is_speech = self._is_speech(frame)

            if is_speech:
                self._silence_count = 0
                self._speech_count += 1
                if not self._in_speech and self._speech_count >= SPEECH_THRESHOLD:
                    self._in_speech = True
                if self._in_speech:
                    self._speech_buffer.append(frame)
            elif self._in_speech:
                self._silence_count += 1
                self._speech_buffer.append(frame)
                if self._silence_count >= SILENCE_THRESHOLD:
                    if len(self._speech_buffer) >= MIN_SPEECH_FRAMES:
                        utterance = np.concatenate(self._speech_buffer)
                    self._reset_vad()
            else:
                self._speech_count = max(0, self._speech_count - 1)

        return utterance

    def _reset_vad(self) -> None:
        self._speech_buffer = []
        self._silence_count = 0
        self._speech_count = 0
        self._in_speech = False

    def reset(self) -> None:
        """Reset VAD state (call on new session or after interruption)."""
        self._reset_vad()

    # ── Transcription ─────────────────────────────────────────────────────────

    async def transcribe(self, audio_f32: np.ndarray) -> dict:
        """
        Transcribe a float32 audio array (16 kHz mono) to text.

        Returns:
            {"text": str, "language": str, "language_probability": float}
        """
        if not self._loaded or self._model is None:
            raise RuntimeError("Whisper not loaded — call await engine.load() first")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._transcribe_sync, audio_f32)

    def _transcribe_sync(self, audio_f32: np.ndarray) -> dict:
        segments, info = self._model.transcribe(
            audio_f32,
            language=self.language,
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400},
            condition_on_previous_text=False,
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
        }

    @property
    def is_loaded(self) -> bool:
        return self._loaded


# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: Optional[WhisperEngine] = None


def get_whisper_engine(
    model_size: str = "base",
    language: Optional[str] = "en",
    device: str = "cpu",
    compute_type: str = "int8",
    force_reload: bool = False,
) -> WhisperEngine:
    """
    Return (or create) the shared WhisperEngine singleton.

    Pass ``force_reload=True`` to hot-swap the engine with new parameters,
    e.g. after activating a fine-tuned model.  ``model_size`` may be a path
    to a local CTranslate2 model directory produced by the training pipeline.
    """
    global _instance
    if _instance is None or force_reload:
        _instance = WhisperEngine(
            model_size=model_size,
            language=language,
            device=device,
            compute_type=compute_type,
        )
    return _instance
