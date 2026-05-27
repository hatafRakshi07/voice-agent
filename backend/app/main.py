from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database.mongodb import connect_db, disconnect_db
from app.routes import twilio_routes, call_routes, voice_routes, dashboard_routes
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] Starting AI Voice Call Agent...")
    try:
        await connect_db()
        logger.info("[STARTUP] MongoDB connected")
    except Exception as exc:
        logger.warning(f"[STARTUP] MongoDB unavailable — running without database: {exc}")
    yield
    try:
        await disconnect_db()
    except Exception:
        pass
    logger.info("[SHUTDOWN] Complete")


app = FastAPI(
    title="AI Voice Call Agent",
    description=(
        "Real-time AI-powered voice call agent — "
        "Twilio + Deepgram + GPT-4o + ElevenLabs"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(twilio_routes.router, prefix="/api/twilio", tags=["Twilio"])
app.include_router(call_routes.router, prefix="/api/calls", tags=["Calls"])
app.include_router(voice_routes.router, prefix="/api/voices", tags=["Voices"])
app.include_router(dashboard_routes.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "AI Voice Call Agent", "version": "1.0.0"}
