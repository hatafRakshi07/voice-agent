"""
stt_service.py
──────────────
Compatibility shim — delegates to the new offline WhisperEngine.
Direct consumers should import from app.stt.whisper_engine instead.
"""

from app.stt.whisper_engine import WhisperEngine, get_whisper_engine

# Re-export for backward compatibility
__all__ = ["WhisperEngine", "get_whisper_engine"]
