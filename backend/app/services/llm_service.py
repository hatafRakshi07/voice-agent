from typing import AsyncIterator
from openai import AsyncOpenAI

from app.utils.logger import logger


class LLMService:
    """OpenAI GPT-4o service for generating conversational responses."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def get_response(self, messages: list[dict], system_prompt: str) -> str:
        """Return a complete response string (non-streaming)."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            max_tokens=300,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""

    async def stream_response(
        self, messages: list[dict], system_prompt: str
    ) -> AsyncIterator[str]:
        """Yield response tokens as they arrive (streaming)."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            max_tokens=300,
            temperature=0.7,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def generate_summary(self, messages: list[dict]) -> str:
        """Generate a concise 2–3 sentence call summary."""
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a call-center analyst. Summarize the following "
                        "phone call transcript in 2-3 concise sentences covering "
                        "the caller's main request and the outcome."
                    ),
                },
                {"role": "user", "content": transcript},
            ],
            max_tokens=150,
            temperature=0.3,
        )
        return response.choices[0].message.content or "No summary available."
