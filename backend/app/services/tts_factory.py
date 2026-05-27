"""
tts_factory.py
──────────────
Returns the configured TTS service singleton based on TTS_BACKEND setting:

  TTS_BACKEND=local      → LocalTTSService  (Coqui XTTS-v2, free, offline)
  TTS_BACKEND=elevenlabs → TTSService        (ElevenLabs API, requires key)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.local_tts_service import LocalTTSService
    from app.services.tts_service import TTSService

_instance = None


def get_tts_service() -> "LocalTTSService | TTSService":
    """Return the TTS service singleton (created on first call)."""
    global _instance
    if _instance is not None:
        return _instance

    from app.config import settings  # noqa: PLC0415 (avoid circular import at module level)

    if settings.TTS_BACKEND == "local":
        from app.services.local_tts_service import LocalTTSService  # noqa: PLC0415
        _instance = LocalTTSService(
            default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
        )
    else:
        from app.services.tts_service import TTSService  # noqa: PLC0415
        _instance = TTSService(
            settings.ELEVENLABS_API_KEY,
            settings.ELEVENLABS_DEFAULT_VOICE_ID,
            settings.ELEVENLABS_MODEL_ID,
        )

    return _instance
