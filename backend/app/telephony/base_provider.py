"""
base_provider.py
────────────────
Abstract base class for telephony providers.

All telephony providers (Asterisk, Android, Twilio) implement this interface.
The active provider is selected via TELEPHONY_PROVIDER env var.
"""

from abc import ABC, abstractmethod


class TelephonyProvider(ABC):
    """
    Abstract telephony provider.

    Implementations:
      AsteriskProvider      — Asterisk FastAGI (local PBX, TELEPHONY_PROVIDER=asterisk)
      AndroidGatewayProvider — Android SIM gateway via WebSocket (TELEPHONY_PROVIDER=android)
      TwilioProvider        — Twilio Media Streams stub (TELEPHONY_PROVIDER=twilio)
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Short identifier shown in logs and status API."""
        ...

    @abstractmethod
    async def start(self) -> None:
        """
        Start the provider.
        Called once during application startup (inside lifespan).
        Should be non-blocking (spawn a background task if needed).
        """
        ...

    @abstractmethod
    async def stop(self) -> None:
        """
        Gracefully shut down.
        Called during application shutdown.
        """
        ...
