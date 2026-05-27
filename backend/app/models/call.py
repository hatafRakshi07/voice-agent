from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class CallStatus(str, Enum):
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"


class Call(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    call_sid: str
    from_number: str
    to_number: str
    status: CallStatus = CallStatus.RINGING
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    voice_id: Optional[str] = None
    summary: Optional[str] = None
    turn_count: int = 0

    model_config = {"populate_by_name": True}
