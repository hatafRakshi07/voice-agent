from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # ── Local STT (faster-whisper) ─────────────────────────────────────────
    WHISPER_MODEL: str = "base"
    WHISPER_LANGUAGE: Optional[str] = "en"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    WHISPER_CUSTOM_MODEL_PATH: Optional[str] = None

    # ── Local LLM (Ollama) ────────────────────────────────────────────────
    OLLAMA_HOST: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 400

    # ── Local TTS (Coqui XTTS-v2) ────────────────────────────────────────
    LOCAL_DEFAULT_VOICE_ID: str = ""
    TTS_LANGUAGE: str = "en"

    # ── SQLite ────────────────────────────────────────────────────────────
    SQLITE_PATH: str = "data/voice_agent.db"

    # ── Recordings ────────────────────────────────────────────────────────
    RECORDINGS_DIR: str = "recordings"

    # ── Asterisk FastAGI ──────────────────────────────────────────────────
    FASTAGI_ENABLED: bool = True
    FASTAGI_HOST: str = "0.0.0.0"
    FASTAGI_PORT: int = 4573

    # ── App ───────────────────────────────────────────────────────────────
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://frontend:3000",
    ]

    # ── Agent persona ─────────────────────────────────────────────────────
    AGENT_NAME: str = "Nova"
    AGENT_SYSTEM_PROMPT: str = (
        "You are Nova, a warm and knowledgeable AI voice assistant. "
        "Keep responses concise and conversational — you are speaking aloud, "
        "not writing text. Use short sentences. Be helpful and friendly."
    )
    MAX_CONVERSATION_TURNS: int = 20

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


settings = Settings()
