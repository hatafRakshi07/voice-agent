from pydantic import BaseModel
from typing import Optional


class VoiceProfile(BaseModel):
    id: Optional[int] = None
    voice_id: str
    name: str
    description: str = ""
    reference_wav: Optional[str] = None
    sample_count: int = 0
    is_default: bool = False
    created_at: str = ""  # ISO-8601 string from SQLite
