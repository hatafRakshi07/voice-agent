"""
call_handler.py
───────────────
Legacy stub — Twilio / Deepgram / OpenAI removed.

The active voice pipeline is now in app/websocket/audio_pipeline.py.
This file is retained so existing imports do not break.
"""

from app.utils.logger import logger


class CallHandler:
    """Stub retained for import compatibility. Not used in production."""

    def __init__(self, *args, **kwargs):
        logger.warning("[CallHandler] Legacy stub — active sessions use AudioPipeline")
