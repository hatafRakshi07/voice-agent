from pydantic import BaseModel
from typing import Optional
from enum import Enum


class CallStatus(str, Enum):
    RINGING     = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    FAILED      = "failed"
    NO_ANSWER   = "no_answer"


class Call(BaseModel):
    id: Optional[int] = None
    call_id: str                          # unique call identifier
    phone_number: str = "unknown"         # caller's number
    direction: str = "inbound"            # inbound | outbound
    status: CallStatus = CallStatus.RINGING
    voice_id: Optional[str] = None
    start_time: str = ""                  # ISO-8601 string from SQLite
    end_time: Optional[str] = None
    duration_seconds: int = 0
    recording_path: Optional[str] = None  # relative path under recordings/
    summary: Optional[str] = None
    turn_count: int = 0
