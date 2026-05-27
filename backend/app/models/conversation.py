from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ConversationTurn(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    call_sid: str
    role: str          # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence: Optional[float] = None   # STT confidence (user turns)
    latency_ms: Optional[int] = None     # LLM+TTS latency (assistant turns)

    model_config = {"populate_by_name": True}
