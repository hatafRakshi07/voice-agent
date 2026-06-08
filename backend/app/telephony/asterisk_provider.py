"""
asterisk_provider.py
────────────────────
TelephonyProvider implementation that starts the Asterisk FastAGI server.

Asterisk connects to this server via TCP (port 4573 by default) whenever
a call arrives.  The FastAGI server handles the full STT → LLM → TTS loop
and plays audio back through Asterisk.

Enabled when:  TELEPHONY_PROVIDER=asterisk  (default)
               FASTAGI_ENABLED=true          (default)
"""

from app.telephony.base_provider import TelephonyProvider
from app.utils.logger import logger


class AsteriskProvider(TelephonyProvider):
    """Asterisk PBX telephony via FastAGI protocol."""

    @property
    def name(self) -> str:
        return "asterisk"

    async def start(self) -> None:
        """Start the FastAGI TCP server in the background."""
        from app.config import settings  # noqa: PLC0415

        if not settings.FASTAGI_ENABLED:
            logger.info("[Telephony/Asterisk] FASTAGI_ENABLED=false — skipping FastAGI server")
            return

        logger.info(
            f"[Telephony/Asterisk] Starting FastAGI server on "
            f"{settings.FASTAGI_HOST}:{settings.FASTAGI_PORT}…"
        )
        from app.telephony.fastagi_server import start_fastagi_server  # noqa: PLC0415
        await start_fastagi_server()

    async def stop(self) -> None:
        logger.info("[Telephony/Asterisk] FastAGI server stopped")
