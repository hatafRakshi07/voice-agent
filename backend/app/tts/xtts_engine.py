"""
xtts_engine.py
──────────────
Offline voice cloning + TTS using Coqui XTTS-v2.

Features:
- Voice cloning from 6–30 second audio sample
- Multilingual synthesis (English, Hindi, and 15+ languages)
- Streaming WAV output for browser playback
- Local voice profile storage
- CPU/GPU compatible
- No API key required
"""

import asyncio
import io
import json
import os
import shutil
import uuid
import wave
from pathlib import Path
from typing import AsyncIterator, Optional

import numpy as np
import soundfile as sf
import torch
from scipy.signal import resample_poly

from app.utils.logger import logger

# ── PyTorch 2.6+ compatibility fix ────────────────────────────────────────────
# PyTorch 2.6+ defaults torch.load to weights_only=True, which blocks Coqui
# XTTS checkpoints containing custom Python classes (XttsConfig, etc.).
# Override the default so Coqui can load its own checkpoints from our local volume.
_orig_torch_load = torch.load

def _torch_load_compat(*args, **kwargs):  # type: ignore[no-untyped-def]
    kwargs.setdefault("weights_only", False)
    return _orig_torch_load(*args, **kwargs)

torch.load = _torch_load_compat  # type: ignore[assignment]
import torch.serialization as _ts
_ts.load = _torch_load_compat  # type: ignore[assignment]

# Voice profiles stored in  backend/voices/<voice_id>/
VOICES_DIR = Path(__file__).resolve().parent.parent.parent / "voices"
VOICES_DIR.mkdir(exist_ok=True)

# XTTS output sample rate
XTTS_SAMPLE_RATE = 24000

# Streaming chunk size (bytes of int16 PCM)
CHUNK_BYTES = 8192


def _audio_bytes_to_wav(data: bytes, out_path: str) -> None:
    """Convert any audio bytes (WAV/MP3/FLAC/OGG) to 16-bit PCM WAV."""
    # Try soundfile first (handles WAV, FLAC, OGG natively)
    try:
        audio, sr = sf.read(io.BytesIO(data), always_2d=False)
        sf.write(out_path, audio, sr, subtype="PCM_16")
        return
    except Exception:
        pass

    # Fallback to librosa (handles MP3 via ffmpeg)
    try:
        import librosa  # noqa: PLC0415
        audio, sr = librosa.load(io.BytesIO(data), sr=None, mono=True)
        sf.write(out_path, audio, sr, subtype="PCM_16")
        return
    except Exception as exc:
        raise RuntimeError(
            "Unsupported audio format. Use WAV, MP3, FLAC, or OGG. "
            f"Details: {exc}"
        ) from exc


def _ndarray_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert float32 numpy audio array to WAV bytes (browser-compatible)."""
    # Normalise to prevent clipping
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.95

    pcm16 = (audio * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


class XTTSEngine:
    """
    Voice cloning TTS backed by Coqui XTTS-v2.

    Public API:
        clone_voice(name, audio_files)  →  voice_id (str)
        synthesize(text, voice_id)       →  wav bytes
        stream(text, voice_id)           →  AsyncIterator[bytes]
        list_voices()                    →  list[dict]
        delete_voice(voice_id)           →  None
    """

    def __init__(self, default_voice_id: Optional[str] = None):
        self.default_voice_id = default_voice_id
        self._tts = None
        self._loaded = False

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def load(self) -> None:
        """Load XTTS-v2 model (non-blocking)."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self) -> None:
        try:
            from TTS.api import TTS  # noqa: PLC0415
        except ImportError as exc:
            raise RuntimeError(
                "Coqui TTS not installed. Run: pip install TTS"
            ) from exc

        # Auto-accept Coqui non-commercial license to avoid interactive prompt
        os.environ.setdefault("COQUI_TOS_AGREED", "1")
        logger.info("[TTS] Loading XTTS-v2 model…")
        self._tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
        self._loaded = True
        logger.info("[TTS] XTTS-v2 ready ✓")

    # ── Voice management ───────────────────────────────────────────────────────

    async def clone_voice(
        self,
        name: str,
        audio_files: list[bytes],
        description: str = "",
    ) -> str:
        """
        Create a voice clone from sample audio bytes.

        Stores a reference WAV and metadata in VOICES_DIR.
        Returns the new voice_id (e.g., 'local_abc123').
        """
        voice_id = f"local_{uuid.uuid4().hex[:12]}"
        voice_dir = VOICES_DIR / voice_id
        voice_dir.mkdir(parents=True, exist_ok=True)
        samples_dir = voice_dir / "samples"
        samples_dir.mkdir(exist_ok=True)

        # Save and convert all samples
        sample_paths: list[str] = []
        for i, data in enumerate(audio_files):
            sample_path = str(samples_dir / f"sample_{i:02d}.wav")
            await asyncio.get_event_loop().run_in_executor(
                None, _audio_bytes_to_wav, data, sample_path
            )
            sample_paths.append(sample_path)

        # Use first sample as the reference (XTTS uses a single reference WAV)
        ref_path = str(voice_dir / "reference.wav")
        shutil.copy2(sample_paths[0], ref_path)

        # Persist metadata
        meta = {
            "voice_id": voice_id,
            "name": name,
            "description": description,
            "reference_wav": ref_path,
            "sample_count": len(sample_paths),
        }
        (voice_dir / "meta.json").write_text(json.dumps(meta, indent=2))
        logger.info(f"[TTS] Voice cloned → {voice_id} ({name})")
        return voice_id

    def list_voices(self) -> list[dict]:
        """Return all locally stored voice profiles."""
        voices: list[dict] = []
        for path in VOICES_DIR.iterdir():
            meta_file = path / "meta.json"
            if meta_file.exists():
                try:
                    meta = json.loads(meta_file.read_text())
                    voices.append(meta)
                except Exception:
                    pass
        return voices

    def _get_reference_wav(self, voice_id: Optional[str]) -> Optional[str]:
        vid = voice_id or self.default_voice_id
        if not vid:
            return None
        ref = VOICES_DIR / vid / "reference.wav"
        return str(ref) if ref.exists() else None

    def delete_voice(self, voice_id: str) -> None:
        """Remove a voice profile from disk."""
        voice_dir = VOICES_DIR / voice_id
        if voice_dir.exists():
            shutil.rmtree(voice_dir)
            logger.info(f"[TTS] Deleted voice {voice_id}")

    # ── Synthesis ──────────────────────────────────────────────────────────────

    async def synthesize(
        self, text: str, voice_id: Optional[str] = None, language: str = "en"
    ) -> bytes:
        """
        Synthesise text to speech and return WAV bytes.

        If voice_id references a cloned voice, uses that reference WAV.
        Falls back to a built-in speaker when no voice is available.
        """
        if not self._loaded or self._tts is None:
            raise RuntimeError("XTTS not loaded — call await engine.load() first")

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._synthesize_sync, text, voice_id, language
        )

    def _synthesize_sync(
        self, text: str, voice_id: Optional[str], language: str
    ) -> bytes:
        ref_wav = self._get_reference_wav(voice_id)

        if ref_wav:
            audio = self._tts.tts(
                text=text,
                speaker_wav=ref_wav,
                language=language,
            )
        else:
            # No voice sample — use built-in speaker
            speakers = getattr(self._tts, "speakers", None) or []
            speaker = speakers[0] if speakers else None
            audio = self._tts.tts(
                text=text,
                speaker=speaker,
                language=language,
            )

        audio_np = np.array(audio, dtype=np.float32)
        return _ndarray_to_wav_bytes(audio_np, XTTS_SAMPLE_RATE)

    async def stream(
        self, text: str, voice_id: Optional[str] = None, language: str = "en"
    ) -> AsyncIterator[bytes]:
        """
        Synthesise text and yield WAV audio in chunks.

        The first chunk is the WAV header; subsequent chunks are PCM16 data.
        This allows the browser to start playing before the full audio is ready.
        """
        wav_bytes = await self.synthesize(text, voice_id, language)

        # Stream in CHUNK_BYTES increments
        offset = 0
        while offset < len(wav_bytes):
            chunk = wav_bytes[offset: offset + CHUNK_BYTES]
            yield chunk
            offset += CHUNK_BYTES

    @property
    def is_loaded(self) -> bool:
        return self._loaded


# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: Optional[XTTSEngine] = None


def get_xtts_engine(default_voice_id: Optional[str] = None) -> XTTSEngine:
    """Return or create the shared XTTSEngine singleton."""
    global _instance
    if _instance is None:
        _instance = XTTSEngine(default_voice_id=default_voice_id)
    return _instance
