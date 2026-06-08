from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # ── Local STT (faster-whisper) ─────────────────────────────────────────
    WHISPER_MODEL: str = "base"
    WHISPER_LANGUAGE: Optional[str] = "en"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    WHISPER_CUSTOM_MODEL_PATH: Optional[str] = None

    # ── LLM Provider selection ────────────────────────────────────────────
    # "ollama"  → local Ollama server (default, fully offline)
    # "gemini"  → Google Gemini API (requires GEMINI_API_KEY)
    LLM_PROVIDER: str = "ollama"

    # ── Local LLM (Ollama) ────────────────────────────────────────────────
    OLLAMA_HOST: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 400

    # ── Google Gemini API ─────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # ── Local TTS (Coqui XTTS-v2) ────────────────────────────────────────
    LOCAL_DEFAULT_VOICE_ID: str = ""
    TTS_LANGUAGE: str = "en"
    VOICE_SAMPLE_PATH: str = ""          # path to a reference WAV for default voice
    XTTS_MODEL: str = "tts_models/multilingual/multi-dataset/xtts_v2"

    # ── SQLite ────────────────────────────────────────────────────────────
    SQLITE_PATH: str = "data/voice_agent.db"

    # ── Recordings ────────────────────────────────────────────────────────
    RECORDINGS_DIR: str = "recordings"

    # ── Telephony provider ────────────────────────────────────────────────
    # "asterisk" → Asterisk FastAGI (local PBX, default)
    # "android"  → Android SIM gateway via WebSocket
    # "twilio"   → Twilio Media Streams (stub, not yet implemented)
    TELEPHONY_PROVIDER: str = "asterisk"

    # ── Asterisk FastAGI ──────────────────────────────────────────────────
    FASTAGI_ENABLED: bool = True
    FASTAGI_HOST: str = "0.0.0.0"
    FASTAGI_PORT: int = 4573

    # ── Android SIM Gateway ───────────────────────────────────────────────
    ANDROID_GATEWAY_SECRET: str = ""     # shared secret for Android app auth
    ANDROID_GATEWAY_URL: str = ""        # URL of the Android gateway (if remote)

    # ── Silero VAD ────────────────────────────────────────────────────────
    USE_SILERO_VAD: bool = False         # True = neural Silero VAD, False = WebRTC VAD
    SILERO_VAD_THRESHOLD: float = 0.5
    SILERO_MODEL: str = "silero_vad"

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
