from typing import AsyncIterator, Optional
import httpx

from app.utils.logger import logger

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
CHUNK_SIZE = 4096  # bytes per stream chunk


class TTSService:
    """ElevenLabs text-to-speech service with voice cloning support.

    Outputs μ-law 8 kHz audio (ulaw_8000) directly, which Twilio
    Media Streams accepts without any format conversion.
    """

    def __init__(self, api_key: str, default_voice_id: str, model_id: str = "eleven_turbo_v2_5"):
        self.api_key = api_key
        self.default_voice_id = default_voice_id
        self.model_id = model_id
        self._headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
        }

    def _build_payload(self, text: str) -> dict:
        return {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.80,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

    async def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Return complete μ-law audio bytes (blocking, low-latency for short text)."""
        vid = voice_id or self.default_voice_id
        url = f"{ELEVENLABS_BASE}/text-to-speech/{vid}"
        params = {"output_format": "ulaw_8000", "optimize_streaming_latency": "3"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url, headers=self._headers, json=self._build_payload(text), params=params
            )
            resp.raise_for_status()
            return resp.content

    async def stream(
        self, text: str, voice_id: Optional[str] = None
    ) -> AsyncIterator[bytes]:
        """Stream μ-law audio chunks for low-latency playback."""
        vid = voice_id or self.default_voice_id
        url = f"{ELEVENLABS_BASE}/text-to-speech/{vid}/stream"
        params = {"output_format": "ulaw_8000", "optimize_streaming_latency": "3"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                url,
                headers=self._headers,
                json=self._build_payload(text),
                params=params,
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(CHUNK_SIZE):
                    if chunk:
                        yield chunk

    # ─── Voice Management ───────────────────────────────────────────────────

    async def list_voices(self) -> list[dict]:
        """List all available ElevenLabs voices."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{ELEVENLABS_BASE}/voices", headers=self._headers
            )
            resp.raise_for_status()
            return resp.json().get("voices", [])

    async def clone_voice(
        self, name: str, audio_files: list[bytes], description: str = ""
    ) -> str:
        """Create an instant voice clone and return the new voice_id."""
        files = [
            ("files", (f"sample_{i}.wav", data, "audio/wav"))
            for i, data in enumerate(audio_files)
        ]
        data = {"name": name, "description": description}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{ELEVENLABS_BASE}/voices/add",
                headers={"xi-api-key": self.api_key},
                data=data,
                files=files,
            )
            resp.raise_for_status()
            return resp.json()["voice_id"]

    async def delete_voice(self, voice_id: str) -> None:
        """Delete a cloned voice by ID."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(
                f"{ELEVENLABS_BASE}/voices/{voice_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
