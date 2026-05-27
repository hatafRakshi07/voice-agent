from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"

    # Deepgram
    DEEPGRAM_API_KEY: str

    # ElevenLabs (optional when TTS_BACKEND=local)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL_ID: str = "eleven_turbo_v2_5"

    # Local TTS (Coqui XTTS-v2)
    TTS_BACKEND: str = "local"      # "local" | "elevenlabs"
    LOCAL_DEFAULT_VOICE_ID: str = ""  # set after cloning your first voice

    # Twilio
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "voice_agent"

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Agent
    AGENT_NAME: str = "Alex"
    AGENT_SYSTEM_PROMPT: str = (
        "You are Alex, a professional and friendly AI voice assistant. "
        "You handle incoming phone calls and help callers with their questions. "
        "Keep responses concise and natural for spoken conversation. "
        "Be warm, empathetic, and helpful."
    )
    MAX_CONVERSATION_TURNS: int = 20

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
