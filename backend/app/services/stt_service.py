import asyncio
from typing import Callable, Awaitable, Optional

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

from app.utils.logger import logger


TranscriptCallback = Callable[[str, float], Awaitable[None]]


class STTService:
    """Deepgram real-time speech-to-text service.

    Accepts μ-law 8 kHz audio directly from Twilio Media Streams,
    so no format conversion is needed.
    """

    def __init__(self, api_key: str):
        config = DeepgramClientOptions(options={"keepalive": "true"})
        self.client = DeepgramClient(api_key, config)

    async def create_connection(
        self,
        on_final: TranscriptCallback,
        on_interim: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        """Open a live Deepgram WebSocket connection and return it."""
        dg_conn = self.client.listen.asyncwebsocket.v("1")

        async def _on_transcript(_conn, result, **kwargs):
            try:
                alt = result.channel.alternatives[0]
                transcript = alt.transcript
                if not transcript:
                    return
                confidence = getattr(alt, "confidence", 1.0)

                if result.is_final:
                    logger.debug(f"[Deepgram] Final: {transcript!r}")
                    await on_final(transcript, confidence)
                elif on_interim:
                    await on_interim(transcript)
            except Exception as e:
                logger.error(f"[Deepgram] Transcript handler error: {e}")

        async def _on_error(_conn, error, **kwargs):
            logger.error(f"[Deepgram] Error: {error}")

        dg_conn.on(LiveTranscriptionEvents.Transcript, _on_transcript)
        dg_conn.on(LiveTranscriptionEvents.Error, _on_error)

        options = LiveOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            encoding="mulaw",        # μ-law — matches Twilio Media Streams
            channels=1,
            sample_rate=8000,        # 8 kHz — matches Twilio
            interim_results=True,
            utterance_end_ms="1000",
            vad_events=True,
            endpointing=300,
        )

        started = await dg_conn.start(options)
        if not started:
            raise RuntimeError("Failed to start Deepgram live connection")

        logger.info("[STT] Deepgram connection opened")
        return dg_conn
