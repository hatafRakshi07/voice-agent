from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class VoiceProfile(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    elevenlabs_voice_id: str
    description: Optional[str] = None
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}
