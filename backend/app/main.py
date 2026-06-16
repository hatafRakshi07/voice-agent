import asyncio
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database.sqlite import connect_db, disconnect_db
from app.routes import call_routes, voice_routes, dashboard_routes, ws_routes, training_routes
from app.routes import recording_routes, android_gateway
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] Starting Self-Hosted AI Voice Agent...")
    logger.info(f"[STARTUP] LLM provider: {settings.LLM_PROVIDER.upper()}")
    logger.info(f"[STARTUP] Telephony provider: {settings.TELEPHONY_PROVIDER.upper()}")
    logger.info(f"[STARTUP] VAD: {'Silero' if settings.USE_SILERO_VAD else 'WebRTC'}")

    # Ensure data and recordings directories exist
    Path(settings.SQLITE_PATH).parent.mkdir(parents=True, exist_ok=True)
    Path(settings.RECORDINGS_DIR).mkdir(parents=True, exist_ok=True)

    # SQLite (always available - no external service required)
    try:
        await connect_db()
        logger.info("[STARTUP] SQLite connected ✓")
    except Exception as exc:
        logger.error(f"[STARTUP] SQLite failed: {exc}")

    # Pre-load ML models in background so first request isn't slow
    asyncio.create_task(_preload_models())

    # Start telephony provider
    asyncio.create_task(_start_telephony_provider())

    yield

    try:
        await disconnect_db()
    except Exception:
        pass
    logger.info("[SHUTDOWN] Complete")


async def _preload_models() -> None:
    """Load Whisper + XTTS-v2 (+ Silero VAD if enabled) in background at startup."""
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

    # Silero VAD (optional)
    if settings.USE_SILERO_VAD:
        from app.services.vad_service import load_vad_if_enabled  # noqa: PLC0415
        await load_vad_if_enabled()


async def _start_telephony_provider() -> None:
    """Start the configured telephony provider."""
    provider_name = settings.TELEPHONY_PROVIDER.lower().strip()

    # "none" = browser-only mode, no telephony hardware needed
    if provider_name in ("none", "", "browser"):
        logger.info("[STARTUP] Telephony provider: browser-only mode (no hardware)")
        return

    try:
        if provider_name == "android":
            from app.telephony.android_gateway_provider import AndroidGatewayProvider  # noqa: PLC0415
            provider = AndroidGatewayProvider()

        elif provider_name == "twilio":
            from app.telephony.twilio_provider import TwilioProvider  # noqa: PLC0415
            provider = TwilioProvider()

        else:
            # Default: asterisk
            if provider_name != "asterisk":
                logger.warning(
                    f"[STARTUP] Unknown TELEPHONY_PROVIDER='{provider_name}' — "
                    "falling back to 'asterisk'"
                )
            from app.telephony.asterisk_provider import AsteriskProvider  # noqa: PLC0415
            provider = AsteriskProvider()

        await provider.start()

    except Exception as exc:
        logger.error(f"[STARTUP] Telephony provider '{provider_name}' failed: {exc}")


app = FastAPI(
    title="Self-Hosted AI Voice Agent",
    description=(
        "Fully offline AI voice agent — "
        "Whisper STT + Gemini/Ollama LLM + Coqui XTTS-v2 TTS. "
        "Supports Asterisk PBX and Android SIM gateway telephony."
    ),
    version="4.0.0",
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
app.include_router(call_routes.router,         prefix="/api/calls",      tags=["Calls"])
app.include_router(voice_routes.router,        prefix="/api/voices",     tags=["Voices"])
app.include_router(dashboard_routes.router,    prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(training_routes.router,     prefix="/api/training",   tags=["Training"])
app.include_router(recording_routes.router,    prefix="/api/recordings", tags=["Recordings"])
app.include_router(android_gateway.router,     prefix="/api/android",    tags=["Android Gateway"])

# WebSocket routes (browser + Android)
app.include_router(ws_routes.router,           prefix="/ws",             tags=["WebSocket"])
# Android gateway WebSocket: WS /ws/android/{call_id}
app.include_router(android_gateway.ws_router,  prefix="/ws/android",     tags=["Android WS"])


@app.get("/health", tags=["Health"])
async def health_check():
    from app.services.llm_service import get_llm_client  # noqa: PLC0415
    from app.stt.whisper_engine import get_whisper_engine  # noqa: PLC0415
    from app.tts.xtts_engine import get_xtts_engine        # noqa: PLC0415

    whisper_ready = get_whisper_engine().is_loaded
    xtts_ready    = get_xtts_engine().is_loaded
    llm           = get_llm_client()
    llm_ready     = await llm.is_available()

    return {
        "status": "healthy",
        "service": "Self-Hosted AI Voice Agent",
        "version": "4.0.0",
        "models": {
            "whisper": whisper_ready,
            "xtts": xtts_ready,
            "llm": {
                "provider": settings.LLM_PROVIDER,
                "ready": llm_ready,
            },
        },
        "telephony": {
            "provider": settings.TELEPHONY_PROVIDER,
            "fastagi_enabled": settings.FASTAGI_ENABLED,
            "fastagi_port": settings.FASTAGI_PORT,
        },
        "vad": "silero" if settings.USE_SILERO_VAD else "webrtc",
    }