"""
vad_service.py
──────────────
Voice Activity Detection using Silero VAD (neural model).

Silero VAD is a lightweight (~2 MB) LSTM-based VAD model that significantly
outperforms energy-based and WebRTC VAD on noisy, telephony, and accented speech.

Enable via:
  USE_SILERO_VAD=true    in .env
  SILERO_VAD_THRESHOLD=0.5   (0.0–1.0; higher = stricter speech detection)

Model download:
  On first run, the model is downloaded from PyTorch Hub (~2 MB) and cached
  in torch's default hub directory (~/.cache/torch/hub/).
  Install:  pip install silero-vad

Interface (same as WhisperEngine.process_chunk):
  engine = SileroVADEngine()
  await engine.load()

  utterance = engine.process_chunk(audio_f32)   # float32, 16 kHz, mono
  if utterance is not None:
      result = await whisper.transcribe(utterance)
"""

import asyncio
from typing import Optional

import numpy as np

from app.utils.logger import logger

# ── VAD parameters ─────────────────────────────────────────────────────────────
_SAMPLE_RATE = 16000
_CHUNK_SAMPLES = 512          # Silero VAD window: 512 samples @ 16 kHz = 32 ms
_SPEECH_PAD_SAMPLES = 1600    # 100 ms padding added before/after speech
_MIN_SPEECH_SAMPLES = 3200    # 200 ms minimum speech to trigger inference
_MIN_SILENCE_SAMPLES = 8000   # 500 ms silence to end utterance


class SileroVADEngine:
    """
    Real-time VAD using the Silero VAD LSTM model.

    Usage:
        engine = SileroVADEngine(threshold=0.5)
        await engine.load()

        # Feed 16 kHz float32 mono audio chunks
        utterance = engine.process_chunk(audio_f32)
        if utterance is not None:
            transcript = await whisper.transcribe(utterance)
    """

    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self._model = None
        self._loaded = False

        # VAD state
        self._speech_buffer: list[np.ndarray] = []
        self._silence_samples: int = 0
        self._speech_samples: int = 0
        self._in_speech: bool = False
        self._pre_buffer: list[np.ndarray] = []   # rolling pre-speech buffer

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def load(self) -> None:
        """Load Silero VAD model (non-blocking)."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self) -> None:
        try:
            from silero_vad import load_silero_vad  # noqa: PLC0415
            logger.info("[VAD] Loading Silero VAD model…")
            self._model = load_silero_vad()
            self._loaded = True
            logger.info("[VAD] Silero VAD ready ✓")
        except ImportError:
            # Fall back to torch.hub if silero-vad package not installed
            logger.warning("[VAD] silero-vad package not found; trying torch.hub…")
            self._load_via_hub()
        except Exception as exc:
            raise RuntimeError(f"Failed to load Silero VAD: {exc}") from exc

    def _load_via_hub(self) -> None:
        try:
            import torch  # noqa: PLC0415
            model, _ = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                trust_repo=True,
                verbose=False,
            )
            self._model = model
            self._loaded = True
            logger.info("[VAD] Silero VAD ready (via torch.hub) ✓")
        except Exception as exc:
            raise RuntimeError(
                "Silero VAD could not be loaded via torch.hub. "
                "Install it: pip install silero-vad\n"
                f"Original error: {exc}"
            ) from exc

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Core processing ────────────────────────────────────────────────────────

    def process_chunk(self, audio_f32: np.ndarray) -> Optional[np.ndarray]:
        """
        Feed a float32 audio chunk (16 kHz, mono).

        Returns a complete utterance array when silence is detected after
        speech, otherwise returns None.  Call reset() between sessions.
        """
        if not self._loaded or self._model is None:
            raise RuntimeError("SileroVADEngine not loaded — call load() first")

        import torch  # noqa: PLC0415

        # Split chunk into Silero-sized windows (512 samples)
        n_windows = len(audio_f32) // _CHUNK_SAMPLES
        utterance: Optional[np.ndarray] = None

        for i in range(n_windows):
            start = i * _CHUNK_SAMPLES
            frame = audio_f32[start: start + _CHUNK_SAMPLES]

            # Compute speech probability
            tensor = torch.from_numpy(frame).unsqueeze(0)
            with torch.no_grad():
                prob = float(self._model(tensor, _SAMPLE_RATE).item())

            is_speech = prob >= self.threshold

            # Maintain rolling pre-speech buffer (1 window)
            if not self._in_speech:
                self._pre_buffer.append(frame)
                if len(self._pre_buffer) > 3:   # keep ~96 ms pre-buffer
                    self._pre_buffer.pop(0)

            if is_speech:
                if not self._in_speech:
                    self._in_speech = True
                    # Include pre-speech padding
                    self._speech_buffer.extend(self._pre_buffer)
                    self._pre_buffer.clear()
                self._speech_buffer.append(frame)
                self._speech_samples += _CHUNK_SAMPLES
                self._silence_samples = 0

            elif self._in_speech:
                self._speech_buffer.append(frame)
                self._silence_samples += _CHUNK_SAMPLES

                if self._silence_samples >= _MIN_SILENCE_SAMPLES:
                    if self._speech_samples >= _MIN_SPEECH_SAMPLES:
                        # Add post-speech padding
                        pad = min(_SPEECH_PAD_SAMPLES, len(self._speech_buffer) * _CHUNK_SAMPLES)
                        utterance = np.concatenate(self._speech_buffer[:len(self._speech_buffer)])
                    self._reset_state()

        return utterance

    def reset(self) -> None:
        """Reset VAD state between sessions or after an interruption."""
        self._reset_state()
        self._pre_buffer.clear()

    def _reset_state(self) -> None:
        self._speech_buffer.clear()
        self._silence_samples = 0
        self._speech_samples = 0
        self._in_speech = False


# ── Factory / singleton ────────────────────────────────────────────────────────

_silero_instance: Optional[SileroVADEngine] = None


def get_silero_vad(threshold: float = 0.5) -> SileroVADEngine:
    """Return (or create) the global SileroVADEngine singleton."""
    global _silero_instance
    if _silero_instance is None:
        _silero_instance = SileroVADEngine(threshold=threshold)
    return _silero_instance


async def load_vad_if_enabled() -> Optional[SileroVADEngine]:
    """
    Load Silero VAD if USE_SILERO_VAD=true in settings.
    Returns the loaded engine, or None if disabled.
    Called during application startup.
    """
    from app.config import settings  # noqa: PLC0415

    if not settings.USE_SILERO_VAD:
        logger.info("[VAD] Silero VAD disabled (USE_SILERO_VAD=false) — using WebRTC VAD")
        return None

    engine = get_silero_vad(threshold=settings.SILERO_VAD_THRESHOLD)
    try:
        await engine.load()
        logger.info(
            f"[VAD] Silero VAD loaded (threshold={settings.SILERO_VAD_THRESHOLD}) ✓"
        )
        return engine
    except Exception as exc:
        logger.error(f"[VAD] Silero VAD load failed: {exc} — falling back to WebRTC VAD")
        return None
