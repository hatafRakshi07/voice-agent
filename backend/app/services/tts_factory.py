"""
tts_factory.py
──────────────
Always returns the local XTTSEngine singleton.
External TTS services have been removed.
"""

from __future__ import annotations

from app.tts.xtts_engine import XTTSEngine, get_xtts_engine


def get_tts_service() -> XTTSEngine:
    """Return the shared XTTSEngine singleton."""
    from app.config import settings  # noqa: PLC0415
    return get_xtts_engine(
        default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
    )
