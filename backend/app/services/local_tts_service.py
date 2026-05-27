"""
local_tts_service.py
────────────────────
Free offline voice cloning + TTS using Coqui XTTS-v2.

No API key required. First run downloads the model (~1.8 GB).
Runs on CPU (slow, ~10-30 s/sentence) or GPU (fast, ~1-3 s/sentence).

Public API mirrors TTSService so it is a drop-in replacement:
  clone_voice(name, audio_files)   → local_<id>  (stored in backend/voices/)
  synthesize(text, voice_id)        → μ-law 8 kHz bytes  (Twilio-compatible)
  stream(text, voice_id)            → async iterator of μ-law chunks
  list_voices()                     → list of locally cloned voices
  delete_voice(voice_id)            → remove voice folder
"""

import asyncio
import io
import json
import math
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import AsyncIterator, Optional

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from app.utils.logger import logger

# ── Storage directory ────────────────────────────────────────────────────────
# backend/voices/<voice_id>/{reference.wav, meta.json, samples/}
VOICES_DIR = Path(__file__).resolve().parent.parent.parent / "voices"
CHUNK_SIZE = 4096  # bytes per stream chunk


def _pcm16_to_ulaw(pcm16: np.ndarray) -> bytes:
    """Convert int16 PCM samples to μ-law bytes (G.711) without audioop."""
    MU = 255
    x = pcm16.astype(np.float32) / 32768.0
    x = np.clip(x, -1.0, 1.0)
    sign = np.sign(x)
    mag = np.abs(x)
    compressed = sign * (np.log1p(MU * mag) / np.log1p(MU))
    ulaw = np.floor((compressed + 1.0) / 2.0 * MU + 0.5).astype(np.uint8)
    return ulaw.tobytes()


def _audio_bytes_to_wav(data: bytes, out_path: str) -> None:
    """
    Read audio bytes of any common format (WAV, MP3, OGG, FLAC, …) and write
    a proper 16-bit PCM WAV file to *out_path*.  Requires librosa (installed
    as a TTS dependency) for MP3 and other non-WAV formats.
    """
    # Try soundfile first (fast, handles WAV/FLAC/OGG natively)
    try:
        audio, sr = sf.read(io.BytesIO(data), always_2d=False)
        sf.write(out_path, audio, sr, subtype="PCM_16")
        return
    except Exception:
        pass

    # Fall back to librosa (handles MP3 via audioread)
    try:
        import librosa  # noqa: PLC0415
        audio, sr = librosa.load(io.BytesIO(data), sr=None, mono=True)
        sf.write(out_path, audio, sr, subtype="PCM_16")
        return
    except Exception as exc:
        raise RuntimeError(
            f"Could not decode audio file — supported formats: WAV, MP3, FLAC, OGG. Error: {exc}"
        ) from exc


def _wav_to_ulaw(wav_path: str) -> bytes:
    """Read a WAV file and return Twilio-compatible μ-law 8000 Hz mono bytes."""
    data, sr = sf.read(wav_path, always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)          # stereo → mono
    if sr != 8000:
        gcd = math.gcd(8000, sr)
        data = resample_poly(data, 8000 // gcd, sr // gcd)
    data = np.clip(data, -1.0, 1.0)
    pcm16 = (data * 32767).astype(np.int16)

    # Prefer stdlib audioop (Python ≤ 3.12); fall back to numpy impl
    try:
        import audioop
        return audioop.lin2ulaw(pcm16.tobytes(), 2)
    except ImportError:
        return _pcm16_to_ulaw(pcm16)


# ── Service ──────────────────────────────────────────────────────────────────

class LocalTTSService:
    """XTTS-v2 voice-cloning TTS that runs entirely on your machine."""

    _model = None  # class-level singleton, loaded lazily on first synthesis

    def __init__(self, default_voice_id: Optional[str] = None):
        self.default_voice_id = default_voice_id
        VOICES_DIR.mkdir(parents=True, exist_ok=True)

    # ── Private helpers ──────────────────────────────────────────────────────

    @classmethod
    def _load_model(cls):
        """Lazy-load XTTS-v2 (downloads ~1.8 GB on first call)."""
        if cls._model is not None:
            return cls._model
        try:
            from TTS.api import TTS  # noqa: PLC0415
        except ImportError as exc:
            raise RuntimeError(
                "Coqui TTS not installed. Run:  pip install TTS"
            ) from exc

        device = "cpu"
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
        except ImportError:
            pass

        logger.info(
            "Loading XTTS-v2 model — first run downloads ~1.8 GB, please wait…"
        )
        cls._model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        logger.info(f"XTTS-v2 ready on {device}")
        return cls._model

    def _voice_dir(self, voice_id: str) -> Path:
        return VOICES_DIR / voice_id

    def _reference_wav(self, voice_id: str) -> Path:
        return self._voice_dir(voice_id) / "reference.wav"

    # ── Public API (mirrors TTSService) ─────────────────────────────────────

    async def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Generate speech from text using the cloned voice. Returns μ-law bytes."""
        vid = voice_id or self.default_voice_id
        if not vid:
            raise ValueError(
                "No voice_id provided and no default local voice configured. "
                "Clone a voice first in the Voices tab."
            )
        ref = self._reference_wav(vid)
        if not ref.exists():
            raise FileNotFoundError(
                f"Local voice '{vid}' not found. "
                "Clone a voice first or choose a different voice_id."
            )

        model = self._load_model()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            loop = asyncio.get_event_loop()
            # tts_to_file() is blocking — run in thread pool
            await loop.run_in_executor(
                None,
                lambda: model.tts_to_file(
                    text=text,
                    speaker_wav=str(ref),
                    language="en",
                    file_path=tmp_path,
                ),
            )
            return _wav_to_ulaw(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def stream(
        self, text: str, voice_id: Optional[str] = None
    ) -> AsyncIterator[bytes]:
        """Yield μ-law audio chunks. XTTS synthesises fully then chunks."""
        audio = await self.synthesize(text, voice_id)
        for i in range(0, len(audio), CHUNK_SIZE):
            yield audio[i : i + CHUNK_SIZE]

    async def clone_voice(
        self, name: str, audio_files: list[bytes], description: str = ""
    ) -> str:
        """Save audio samples locally and return a new local voice ID."""
        voice_id = f"local_{uuid.uuid4().hex[:12]}"
        vdir = self._voice_dir(voice_id)
        samples_dir = vdir / "samples"
        samples_dir.mkdir(parents=True, exist_ok=True)

        # Persist all uploaded samples converted to WAV
        saved: list[str] = []
        for i, data in enumerate(audio_files):
            wav_path = str(samples_dir / f"sample_{i}.wav")
            _audio_bytes_to_wav(data, wav_path)
            saved.append(wav_path)

        # First sample becomes the XTTS reference clip
        # (ideally 6-30 seconds of clear speech)
        shutil.copy(saved[0], str(self._reference_wav(voice_id)))

        # Write metadata
        (vdir / "meta.json").write_text(
            json.dumps(
                {
                    "name": name,
                    "description": description,
                    "samples": len(audio_files),
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        logger.info(f"Local voice cloned: '{name}' → {voice_id}")
        return voice_id

    async def list_voices(self) -> list[dict]:
        """Return all locally stored voice clones."""
        voices: list[dict] = []
        if not VOICES_DIR.exists():
            return voices
        for entry in VOICES_DIR.iterdir():
            if not entry.is_dir():
                continue
            meta_file = entry / "meta.json"
            if not meta_file.exists():
                continue
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                continue
            voices.append(
                {
                    "voice_id": entry.name,
                    "name": meta.get("name", entry.name),
                    "description": meta.get("description", ""),
                    "category": "cloned_local",
                    "is_saved": True,
                }
            )
        return voices

    async def delete_voice(self, voice_id: str) -> None:
        """Remove voice directory from disk."""
        vdir = self._voice_dir(voice_id)
        if vdir.exists():
            shutil.rmtree(vdir)
        logger.info(f"Local voice deleted: {voice_id}")
