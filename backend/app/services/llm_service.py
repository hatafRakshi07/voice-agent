"""
llm_service.py
──────────────
Compatibility shim — delegates to the new offline OllamaClient.
Direct consumers should import from app.llm.ollama_client instead.
"""

from app.llm.ollama_client import OllamaClient, get_ollama_client

# Re-export for backward compatibility
__all__ = ["OllamaClient", "get_ollama_client"]
