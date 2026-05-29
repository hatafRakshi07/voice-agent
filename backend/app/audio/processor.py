"""
processor.py
────────────
Low-level audio processing utilities.

- PCM format conversions (float32 ↔ int16 ↔ base64)
- Sample rate resampling
- WebM / OGG decode to float32 (via soundfile + ffmpeg)
- Audio energy / RMS helpers
"""

import base64
import io
import wave
from typing import Tuple

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

# Target sample rate for STT (Whisper requires 16 kHz)
STT_SAMPLE_RATE = 16000

# Target sample rate for TTS playback (XTTS-v2 outputs 24 kHz)
TTS_SAMPLE_RATE = 24000


# ── Format conversions ────────────────────────────────────────────────────────

def float32_to_int16(audio: np.ndarray) -> np.ndarray:
    """Clip and convert float32 → int16."""
    return (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)


def int16_to_float32(audio: np.ndarray) -> np.ndarray:
    """Convert int16 → float32 in [-1.0, 1.0]."""
    return audio.astype(np.float32) / 32768.0


def base64_to_float32(b64: str, dtype: str = "float32") -> np.ndarray:
    """
    Decode a base64-encoded PCM buffer to a float32 numpy array.

    The browser AudioWorklet sends float32 samples in native endian order.
    """
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=dtype)
    if dtype != "float32":
        arr = int16_to_float32(arr)
    return arr


def float32_to_base64(audio: np.ndarray) -> str:
    """Encode float32 numpy array to base64 string."""
    return base64.b64encode(audio.astype(np.float32).tobytes()).decode()


def wav_bytes_to_base64(wav_bytes: bytes) -> str:
    """Encode WAV bytes to base64 string (for JSON transport)."""
    return base64.b64encode(wav_bytes).decode()


# ── Resampling ─────────────────────────────────────────────────────────────────

def resample(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Resample audio from src_rate to dst_rate using polyphase filtering."""
    if src_rate == dst_rate:
        return audio

    from math import gcd  # noqa: PLC0415
    g = gcd(src_rate, dst_rate)
    up = dst_rate // g
    down = src_rate // g
    return resample_poly(audio, up, down).astype(np.float32)


def to_mono(audio: np.ndarray) -> np.ndarray:
    """Convert multi-channel audio to mono by averaging channels."""
    if audio.ndim == 1:
        return audio
    return audio.mean(axis=1)


def prepare_for_whisper(audio: np.ndarray, src_rate: int) -> np.ndarray:
    """
    Convert any audio array to Whisper-compatible format:
    float32, 16 kHz, mono.
    """
    audio = to_mono(audio)
    audio = resample(audio, src_rate, STT_SAMPLE_RATE)
    return audio.astype(np.float32)


# ── WebM / blob decoding ───────────────────────────────────────────────────────

def decode_browser_audio(raw_bytes: bytes) -> Tuple[np.ndarray, int]:
    """
    Decode browser audio blob (WebM/Opus/OGG/WAV) to (float32 array, sample_rate).

    Uses soundfile with libsndfile; falls back to librosa for formats that
    require ffmpeg (e.g., WebM).
    """
    # Try soundfile first
    try:
        audio, sr = sf.read(io.BytesIO(raw_bytes), always_2d=False)
        return to_mono(audio).astype(np.float32), int(sr)
    except Exception:
        pass

    # Fallback: librosa (requires ffmpeg on PATH for WebM)
    try:
        import librosa  # noqa: PLC0415
        audio, sr = librosa.load(io.BytesIO(raw_bytes), sr=None, mono=True)
        return audio.astype(np.float32), int(sr)
    except Exception as exc:
        raise RuntimeError(
            f"Cannot decode audio: {exc}. "
            "Ensure ffmpeg is installed for WebM/Opus support."
        ) from exc


# ── Energy / VAD helpers ───────────────────────────────────────────────────────

def rms_energy(audio: np.ndarray) -> float:
    """Return RMS energy of the audio frame (float32 input)."""
    return float(np.sqrt(np.mean(audio ** 2)))


def is_silent(audio: np.ndarray, threshold: float = 0.01) -> bool:
    """Return True if the frame is below the silence threshold."""
    return rms_energy(audio) < threshold


# ── WAV I/O ───────────────────────────────────────────────────────────────────

def read_wav(path: str) -> Tuple[np.ndarray, int]:
    """Read a WAV file and return (float32 array, sample_rate)."""
    audio, sr = sf.read(path, always_2d=False)
    return to_mono(audio).astype(np.float32), int(sr)


def write_wav(path: str, audio: np.ndarray, sample_rate: int) -> None:
    """Write a float32 array as a 16-bit PCM WAV file."""
    sf.write(path, audio, sample_rate, subtype="PCM_16")


def ndarray_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Return in-memory WAV bytes from a float32 numpy array."""
    pcm16 = float32_to_int16(audio)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()
