"""
gemini_client.py
────────────────
Google Gemini API LLM client.

Features:
- Streaming token generation via generate_content_async
- Conversation history (user / assistant turns)
- System prompt via system_instruction parameter
- Sentence-boundary yielding for TTS pipelining
- Auto-retry on rate limits / transient errors
- Full interface parity with OllamaClient

Environment variable:
  GEMINI_API_KEY=<your key>

Supported models (as of 2025):
  gemini-1.5-flash   (default — free tier, fast)
  gemini-1.5-pro     (higher quality, lower rate limit)
  gemini-2.0-flash   (latest, fast)
"""

import asyncio
import re
from typing import AsyncIterator, Optional

from app.utils.logger import logger

# Sentence-boundary regex — same as OllamaClient
_SENTENCE_END = re.compile(r"(?<=[.!?।])\s+|(?<=[.!?।])$")

_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 1.5   # seconds; multiplied by attempt number


class GeminiClient:
    """
    Async Google Gemini client with streaming support.

    The interface is identical to OllamaClient so callers can swap
    providers without changing call sites.

    Usage:
        client = GeminiClient(api_key="...", model="gemini-1.5-flash")

        async for sentence in client.stream_sentences(messages, system_prompt):
            wav = await xtts.synthesize(sentence)
            ...
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout: float = 60.0,
    ):
        self.api_key = api_key
        self.model_name = model
        self.timeout = timeout

    # ── Health check ───────────────────────────────────────────────────────────

    async def is_available(self) -> bool:
        """Return True if the API key is set and Gemini responds."""
        if not self.api_key:
            return False
        try:
            import google.generativeai as genai  # noqa: PLC0415
            genai.configure(api_key=self.api_key)
            loop = asyncio.get_event_loop()
            models = await loop.run_in_executor(
                None, lambda: list(genai.list_models())
            )
            return len(models) > 0
        except Exception:
            return False

    # ── Message conversion ─────────────────────────────────────────────────────

    @staticmethod
    def _to_gemini_contents(messages: list[dict]) -> list[dict]:
        """
        Convert OpenAI-style message list → Gemini contents list.

        OpenAI:  {"role": "user"|"assistant"|"system", "content": "..."}
        Gemini:  {"role": "user"|"model",              "parts": [{"text": "..."}]}

        System messages are skipped (handled via system_instruction).
        """
        contents: list[dict] = []
        for msg in messages:
            role = msg.get("role", "user")
            if role == "system":
                continue
            if role == "assistant":
                role = "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        return contents

    # ── Core streaming method ──────────────────────────────────────────────────

    async def stream_response(
        self,
        messages: list[dict],
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        """
        Yield LLM response tokens one-by-one as they stream from Gemini.

        Retries up to _MAX_RETRIES times on rate-limit / transient errors.
        """
        try:
            import google.generativeai as genai  # noqa: PLC0415
        except ImportError as exc:
            raise RuntimeError(
                "google-generativeai not installed. Run: pip install google-generativeai"
            ) from exc

        genai.configure(api_key=self.api_key)

        # Build model with optional system instruction
        model_kwargs: dict = {
            "model_name": self.model_name,
            "generation_config": genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        }
        if system_prompt:
            model_kwargs["system_instruction"] = system_prompt

        model = genai.GenerativeModel(**model_kwargs)
        contents = self._to_gemini_contents(messages)

        if not contents:
            yield "[No messages to process]"
            return

        for attempt in range(_MAX_RETRIES):
            try:
                response = await model.generate_content_async(
                    contents,
                    stream=True,
                    request_options={"timeout": self.timeout},
                )
                async for chunk in response:
                    try:
                        text = chunk.text
                        if text:
                            yield text
                    except Exception:
                        # Some chunks have no text (e.g. finish reason chunks)
                        continue
                return  # Success — exit retry loop

            except Exception as exc:
                err_str = str(exc).lower()
                is_rate_limit = any(kw in err_str for kw in ("quota", "rate", "429", "resource_exhausted"))
                is_transient = any(kw in err_str for kw in ("503", "unavailable", "timeout", "deadline"))

                if (is_rate_limit or is_transient) and attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (attempt + 1)
                    logger.warning(
                        f"[LLM/Gemini] Transient error on attempt {attempt + 1}: {exc}. "
                        f"Retrying in {delay:.1f}s…"
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.error(f"[LLM/Gemini] Unrecoverable error: {exc}")
                yield f"[Gemini error: {exc}]"
                return

    # ── Sentence streaming (for TTS pipelining) ────────────────────────────────

    async def stream_sentences(
        self,
        messages: list[dict],
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        """
        Like stream_response but yields complete sentences instead of raw tokens.

        Each sentence is yielded as soon as the boundary is detected, enabling
        TTS synthesis to begin before the full LLM response is complete.
        """
        buffer = ""
        async for token in self.stream_response(
            messages, system_prompt, temperature, max_tokens
        ):
            buffer += token
            parts = _SENTENCE_END.split(buffer)
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    yield sentence
            buffer = parts[-1]

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
        """Collect the full streaming response into a single string."""
        parts: list[str] = []
        async for token in self.stream_response(
            messages, system_prompt, temperature, max_tokens
        ):
            parts.append(token)
        return "".join(parts)

    async def generate_summary(self, messages: list[dict]) -> str:
        """Generate a short call summary from conversation history."""
        summary_messages = [
            *messages,
            {
                "role": "user",
                "content": (
                    "Please provide a 1-2 sentence summary of the above conversation. "
                    "Focus on the main topic and outcome."
                ),
            },
        ]
        return await self.get_response(
            summary_messages,
            system_prompt="You are a helpful assistant that summarises conversations concisely.",
            temperature=0.3,
            max_tokens=150,
        )


# ── Singleton ──────────────────────────────────────────────────────────────────

_gemini_instance: Optional[GeminiClient] = None


def get_gemini_client(
    api_key: str = "",
    model: str = "gemini-1.5-flash",
) -> GeminiClient:
    """Return (or create) the global GeminiClient singleton."""
    global _gemini_instance
    if _gemini_instance is None or _gemini_instance.api_key != api_key:
        _gemini_instance = GeminiClient(api_key=api_key, model=model)
    return _gemini_instance
