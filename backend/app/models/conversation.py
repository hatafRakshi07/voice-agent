from pydantic import BaseModel
from typing import Optional


class ConversationTurn(BaseModel):
    id: Optional[int] = None
    call_id: str
    role: str                          # "user" | "assistant"
    content: str
    timestamp: str = ""               # ISO-8601 string from SQLite
    confidence: Optional[float] = None # STT confidence (user turns)
    latency_ms: Optional[int] = None   # LLM+TTS latency (assistant turns)
