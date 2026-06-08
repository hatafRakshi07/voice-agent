"""
android_gateway_provider.py
────────────────────────────
TelephonyProvider for the Android SIM gateway.

When TELEPHONY_PROVIDER=android, incoming calls are received via an
Android phone running a SIM-gateway app.  The app forwards call audio
to our WebSocket endpoints and plays back the TTS response.

WebSocket endpoints (registered separately in main.py via android_gateway.py):
  WS  /ws/android/{call_id}       — bidirectional audio pipeline
  POST /api/android/call-start    — signal call start, get call_id
  POST /api/android/call-end      — signal call end

This provider class only reports readiness at startup; the actual
WebSocket handling is done by android_gateway.py routes.
"""

from app.telephony.base_provider import TelephonyProvider
from app.utils.logger import logger


class AndroidGatewayProvider(TelephonyProvider):
    """Android SIM gateway telephony provider."""

    @property
    def name(self) -> str:
        return "android"

    async def start(self) -> None:
        from app.config import settings  # noqa: PLC0415
        logger.info(
            "[Telephony/Android] Android Gateway provider active — "
            "waiting for calls on WS /ws/android/{call_id}"
        )
        if settings.ANDROID_GATEWAY_SECRET:
            logger.info("[Telephony/Android] Gateway authentication: ENABLED")
        else:
            logger.warning(
                "[Telephony/Android] ANDROID_GATEWAY_SECRET is not set — "
                "gateway is unauthenticated!"
            )

    async def stop(self) -> None:
        logger.info("[Telephony/Android] Android Gateway provider stopped")
