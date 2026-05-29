"""
tts_service.py
──────────────
Compatibility shim — delegates to the new offline XTTSEngine.
Direct consumers should import from app.tts.xtts_engine instead.
"""

from app.tts.xtts_engine import XTTSEngine, get_xtts_engine

# Re-export for backward compatibility
__all__ = ["XTTSEngine", "get_xtts_engine"]
