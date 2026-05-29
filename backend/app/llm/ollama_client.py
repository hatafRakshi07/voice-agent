"""
ollama_client.py
────────────────
Local LLM client using the Ollama REST API.

Features:
- Fully offline — runs against local Ollama server
- Streaming token generation via NDJSON
- Conversation history management
- System prompt support
- Sentence-boundary detection for TTS pipelining
- Auto-retry connection
"""

import asyncio
import json
import re
from typing import AsyncIterator, Optional

import httpx

from app.utils.logger import logger

# Regex to detect sentence boundaries for sentence-by-sentence TTS streaming
_SENTENCE_END = re.compile(r"(?<=[.!?।])\s+|(?<=[.!?।])$")


class OllamaClient:
    """
    Async Ollama client with streaming support.

    Ollama must be running locally (``ollama serve``).
    The default endpoint is http://localhost:11434.
    """

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "llama3",
        timeout: float = 120.0,
    ):
        self.host = host.rstrip("/")
        self.model = model
        self.timeout = timeout

    # ── Health / model management ──────────────────────────────────────────────

    async def is_available(self) -> bool:
        """Return True if Ollama is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.host}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        """Return names of all locally available models."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.host}/api/tags")
                resp.raise_for_status()
                return [m["name"] for m in resp.json().get("models", [])]
        except Exception:
            return []

    async def ensure_model(self) -> bool:
        """
        Check whether the configured model is downloaded; pull it if not.
        Returns True on success.
        """
        models = await self.list_models()
        base = self.model.split(":")[0]
        if any(base in m for m in models):
            logger.info(f"[LLM] Model '{self.model}' already downloaded ✓")
            return True

        logger.info(f"[LLM] Pulling '{self.model}' — this may take several minutes…")
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.host}/api/pull",
                    json={"name": self.model},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line:
                            data = json.loads(line)
                            status = data.get("status", "")
                            if status and "pulling" not in status.lower():
                                logger.info(f"[LLM] {status}")
            logger.info(f"[LLM] '{self.model}' ready ✓")
            return True
        except Exception as exc:
            logger.error(f"[LLM] Pull failed: {exc}")
            return False

    # ── Streaming chat ─────────────────────────────────────────────────────────

    async def stream_response(
        self,
        messages: list[dict],
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        """
        Yield LLM response tokens one-by-one as they arrive.

        The caller can buffer tokens into sentences and pipe each sentence to
        TTS in parallel with LLM generation.
        """
        full_messages: list[dict] = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.host}/api/chat",
                    json=payload,
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            logger.error(f"[LLM] Cannot reach Ollama at {self.host}")
            yield "[Ollama not running — start with: ollama serve]"
        except httpx.ReadTimeout:
            logger.error("[LLM] Response timed out")
            yield "[Response timeout — model may be loading]"
        except Exception as exc:
            logger.error(f"[LLM] Unexpected error: {exc}")
            yield f"[Error: {exc}]"

    # ── Sentence-streaming helper ──────────────────────────────────────────────

    async def stream_sentences(
        self,
        messages: list[dict],
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        """
        Like stream_response but yields complete sentences instead of tokens.

        Use this to pipeline LLM output into TTS with minimal latency:
        each sentence is yielded as soon as it is complete, allowing TTS
        synthesis to begin before the full response is generated.
        """
        buffer = ""
        async for token in self.stream_response(
            messages, system_prompt, temperature, max_tokens
        ):
            buffer += token
            # Flush on sentence boundaries
            parts = _SENTENCE_END.split(buffer)
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    yield sentence
            buffer = parts[-1]

        # Yield remaining text
        remainder = buffer.strip()
        if remainder:
            yield remainder

    # ── Non-streaming ──────────────────────────────────────────────────────────

    async def get_response(
        self,
        messages: list[dict],
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> str:
        """Return the complete response as a single string."""
        tokens: list[str] = []
        async for token in self.stream_response(
            messages, system_prompt, temperature, max_tokens
        ):
            tokens.append(token)
        return "".join(tokens)

    async def generate_summary(self, messages: list[dict]) -> str:
        """Generate a 2-sentence conversation summary."""
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )
        system = (
            "You are a conversation analyst. "
            "Summarize the following conversation in 2-3 sentences."
        )
        return await self.get_response(
            [{"role": "user", "content": transcript}],
            system_prompt=system,
            temperature=0.3,
            max_tokens=150,
        )


# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: Optional[OllamaClient] = None


def get_ollama_client(
    host: str = "http://localhost:11434",
    model: str = "llama3",
) -> OllamaClient:
    """Return or create the shared OllamaClient singleton."""
    global _instance
    if _instance is None:
        _instance = OllamaClient(host=host, model=model)
    return _instance
