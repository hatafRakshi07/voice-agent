"""
llm_service.py
──────────────
LLM client factory.

Returns either OllamaClient or GeminiClient based on LLM_PROVIDER setting:
  LLM_PROVIDER=ollama  → local Ollama server (default, fully offline)
  LLM_PROVIDER=gemini  → Google Gemini API (requires GEMINI_API_KEY)

All call sites should use get_llm_client() instead of importing a specific
client class, so the provider can be swapped via environment variable alone.
"""

from typing import Union

from app.config import settings
from app.llm.gemini_client import GeminiClient, get_gemini_client
from app.llm.ollama_client import OllamaClient, get_ollama_client
from app.utils.logger import logger

# Union type that callers can use for type annotations
LLMClient = Union[OllamaClient, GeminiClient]


def get_llm_client() -> LLMClient:
    """
    Return the configured LLM client singleton.

    Provider is selected by LLM_PROVIDER env var:
      - "ollama"  (default) → OllamaClient pointed at OLLAMA_HOST
      - "gemini"            → GeminiClient using GEMINI_API_KEY
    """
    provider = settings.LLM_PROVIDER.lower().strip()

    if provider == "gemini":
        if not settings.GEMINI_API_KEY:
            logger.warning(
                "[LLM] LLM_PROVIDER=gemini but GEMINI_API_KEY is empty — "
                "set GEMINI_API_KEY in .env"
            )
        logger.debug(f"[LLM] Using Gemini ({settings.GEMINI_MODEL})")
        return get_gemini_client(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )

    if provider != "ollama":
        logger.warning(
            f"[LLM] Unknown LLM_PROVIDER='{provider}' — falling back to 'ollama'"
        )

    logger.debug(f"[LLM] Using Ollama ({settings.OLLAMA_HOST} / {settings.OLLAMA_MODEL})")
    return get_ollama_client(
        host=settings.OLLAMA_HOST,
        model=settings.OLLAMA_MODEL,
    )


# Re-export individual constructors for callers that need them directly
__all__ = [
    "LLMClient",
    "get_llm_client",
    "OllamaClient",
    "get_ollama_client",
    "GeminiClient",
    "get_gemini_client",
]
