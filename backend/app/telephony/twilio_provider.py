"""
twilio_provider.py
──────────────────
TelephonyProvider stub for Twilio Media Streams.

This provider is a placeholder.  To fully implement Twilio support:
  1. Restore backend/app/routes/twilio_routes.py (see git history)
  2. Add Twilio SDK: pip install twilio
  3. Set env vars:
       TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       TWILIO_AUTH_TOKEN=your_auth_token
       TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

The Twilio call flow:
  Caller → Twilio → POST /api/twilio/voice (TwiML) → WSS /api/twilio/stream/{call_sid}
  → FastAPI backend → STT → LLM → TTS → μ-law audio stream → Twilio → Caller
"""

from app.telephony.base_provider import TelephonyProvider
from app.utils.logger import logger


class TwilioProvider(TelephonyProvider):
    """Twilio Media Streams telephony provider (stub — not yet implemented)."""

    @property
    def name(self) -> str:
        return "twilio"

    async def start(self) -> None:
        logger.warning(
            "[Telephony/Twilio] Twilio provider is a stub. "
            "Switch to TELEPHONY_PROVIDER=asterisk or TELEPHONY_PROVIDER=android "
            "for a working provider."
        )

    async def stop(self) -> None:
        pass
