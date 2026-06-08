import asyncio
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database.sqlite import connect_db, disconnect_db
from app.routes import call_routes, voice_routes, dashboard_routes, ws_routes, training_routes
from app.routes import recording_routes
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] Starting Self-Hosted AI Voice Agent...")

    # Ensure data and recordings directories exist
    Path(settings.SQLITE_PATH).parent.mkdir(parents=True, exist_ok=True)
    Path(settings.RECORDINGS_DIR).mkdir(parents=True, exist_ok=True)

    # SQLite (always available - no external service required)
    try:
        await connect_db()
        logger.info("[STARTUP] SQLite connected v")
    except Exception as exc:
        logger.error(f"[STARTUP] SQLite failed: {exc}")

    # Pre-load ML models in background so first request isn't slow
    asyncio.create_task(_preload_models())

    # Start Asterisk FastAGI server (disabled if FASTAGI_ENABLED=false)
    if settings.FASTAGI_ENABLED:
        asyncio.create_task(_run_fastagi())

    yield

    try:
        await disconnect_db()
    except Exception:
        pass
    logger.info("[SHUTDOWN] Complete")


async def _preload_models() -> None:
    """Load Whisper + XTTS-v2 in background at startup."""
    from app.stt.whisper_engine import get_whisper_engine  # noqa: PLC0415
    from app.tts.xtts_engine import get_xtts_engine        # noqa: PLC0415

    whisper = get_whisper_engine(
        model_size=settings.WHISPER_MODEL,
        language=settings.WHISPER_LANGUAGE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )
    xtts = get_xtts_engine(
        default_voice_id=settings.LOCAL_DEFAULT_VOICE_ID or None,
    )

    try:
        await whisper.load()
    except Exception as exc:
        logger.error(f"[STARTUP] Whisper load failed: {exc}")

    try:
        await xtts.load()
    except Exception as exc:
        logger.error(f"[STARTUP] XTTS load failed: {exc}")


async def _run_fastagi() -> None:
    """Start the Asterisk FastAGI TCP server."""
    try:
        from app.telephony.fastagi_server import start_fastagi_server  # noqa: PLC0415
        await start_fastagi_server()
    except Exception as exc:
        logger.error(f"[STARTUP] FastAGI server failed: {exc}")


app = FastAPI(
    title="Self-Hosted AI Voice Agent",
    description=(
        "Fully offline AI voice assistant - "
        "Whisper STT + Ollama LLM + Coqui XTTS-v2 TTS + Asterisk PBX. "
        "No external APIs required."
    ),
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP routes
app.include_router(call_routes.router,      prefix="/api/calls",      tags=["Calls"])
app.include_router(voice_routes.router,     prefix="/api/voices",     tags=["Voices"])
app.include_router(dashboard_routes.router, prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(training_routes.router,  prefix="/api/training",   tags=["Training"])
app.include_router(recording_routes.router, prefix="/api/recordings", tags=["Recordings"])

# WebSocket route (browser voice pipeline)
app.include_router(ws_routes.router, prefix="/ws", tags=["WebSocket"])


@app.get("/health", tags=["Health"])
async def health_check():
    from app.stt.whisper_engine import get_whisper_engine  # noqa: PLC0415
    from app.tts.xtts_engine import get_xtts_engine        # noqa: PLC0415
    from app.llm.ollama_client import get_ollama_client    # noqa: PLC0415

    whisper_ready = get_whisper_engine().is_loaded
    xtts_ready    = get_xtts_engine().is_loaded
    ollama_ready  = await get_ollama_client(
        host=settings.OLLAMA_HOST, model=settings.OLLAMA_MODEL
    ).is_available()

    return {
        "status": "healthy",
        "service": "Self-Hosted AI Voice Agent",
        "version": "3.0.0",
        "models": {
            "whisper": whisper_ready,
            "xtts": xtts_ready,
            "ollama": ollama_ready,
        },
        "telephony": {
            "fastagi_enabled": settings.FASTAGI_ENABLED,
            "fastagi_port": settings.FASTAGI_PORT,
        },
    }