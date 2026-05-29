"""
twilio_routes.py
────────────────
Twilio has been removed from this project.

Browser-based WebSocket voice calls are handled by ws_routes.py:
    WS /ws/voice

This file is retained to avoid breaking any import references.
"""

from fastapi import APIRouter

router = APIRouter()
