from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # ── Local STT (faster-whisper) ─────────────────────────────────────────
    # Model sizes: tiny, base, small, medium, large-v3
    # Larger = more accurate but slower / more RAM
    WHISPER_MODEL: str = "base"
    WHISPER_LANGUAGE: Optional[str] = "en"   # None = auto-detect
    WHISPER_DEVICE: str = "cpu"              # "cpu" or "cuda"
    WHISPER_COMPUTE_TYPE: str = "int8"       # "int8" | "float16" | "float32"
    # Set to an absolute path to load a fine-tuned CTranslate2 model instead
    WHISPER_CUSTOM_MODEL_PATH: Optional[str] = None

    # ── Local LLM (Ollama) ────────────────────────────────────────────────
    OLLAMA_HOST: str = "http://ollama:11434"  # service name in Docker
    OLLAMA_MODEL: str = "llama3"              # or "mistral", "llama3:8b", etc.
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 400

    # ── Local TTS (Coqui XTTS-v2) ────────────────────────────────────────
    LOCAL_DEFAULT_VOICE_ID: str = ""   # set to a cloned voice_id after first clone
    TTS_LANGUAGE: str = "en"           # default synthesis language

    # ── MongoDB ───────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://mongo:27017"
    MONGODB_DB_NAME: str = "voice_agent"

    # ── App ───────────────────────────────────────────────────────────────
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
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
