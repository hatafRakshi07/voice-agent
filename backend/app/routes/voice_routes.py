"""
voice_routes.py
────────────────
REST endpoints for managing ElevenLabs voices / voice clones.

  GET    /api/voices              — list all voices (ElevenLabs + DB profiles)
  POST   /api/voices/clone        — upload samples, create instant voice clone
  POST   /api/voices/{id}/default — set as the default call voice
  DELETE /api/voices/{id}         — delete a cloned voice
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.config import settings
from app.database.mongodb import get_db
from app.database.repositories.voice_profile_repository import VoiceProfileRepository
from app.models.voice_profile import VoiceProfile
from app.services.tts_factory import get_tts_service
from app.utils.logger import logger

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
@router.get("")
async def list_voices():
    """List available voices merged with local DB profiles."""
    el_voices = await get_tts_service().list_voices()

    profiles: list = []
    try:
        db = await get_db()
        repo = VoiceProfileRepository(db)
        profiles = await repo.list_all()
    except Exception:
        pass  # No MongoDB — profiles list stays empty

    profile_ids = {p.elevenlabs_voice_id for p in profiles}

    # Mark which voices are saved locally
    for v in el_voices:
        v["is_saved"] = v["voice_id"] in profile_ids or v.get("category") == "cloned_local"

    return {"voices": el_voices, "profiles": [p.model_dump(by_alias=False) for p in profiles]}


# ─────────────────────────────────────────────────────────────────────────────
@router.post("/clone")
async def clone_voice(
    name: str = Form(...),
    description: str = Form(""),
    files: list[UploadFile] = File(..., description="Audio samples (wav/mp3, ≤25 MB each)"),
):
    """Create an ElevenLabs instant voice clone and save the profile."""
    if not files:
        raise HTTPException(status_code=400, detail="At least one audio sample is required")
    if len(files) > 25:
        raise HTTPException(status_code=400, detail="Maximum 25 audio samples allowed")

    samples: list[bytes] = []
    for f in files:
        data = await f.read()
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"{f.filename} exceeds 25 MB limit")
        samples.append(data)

    try:
        voice_id = await get_tts_service().clone_voice(name=name, audio_files=samples, description=description)
    except Exception as exc:
        logger.error(f"Voice clone failed: {exc}")
        raise HTTPException(status_code=502, detail=f"Clone error: {exc}")

    # Persist profile in DB (best-effort — works without MongoDB too)
    try:
        db = await get_db()
        repo = VoiceProfileRepository(db)
        profile = VoiceProfile(
            name=name,
            elevenlabs_voice_id=voice_id,
            description=description,
        )
        await repo.create(profile)
    except Exception as exc:
        logger.warning(f"DB profile save skipped (no MongoDB?): {exc}")

    return {"voice_id": voice_id, "name": name, "message": "Voice cloned successfully"}


# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{voice_id}/default")
async def set_default_voice(voice_id: str):
    """Set this voice as the default for all new calls."""
    try:
        db = await get_db()
        repo = VoiceProfileRepository(db)
        await repo.set_default(voice_id)
    except Exception as exc:
        logger.warning(f"DB set-default skipped (no MongoDB?): {exc}")
    return {"message": f"Voice {voice_id} set as default"}


# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{voice_id}")
async def delete_voice(voice_id: str):
    """Delete the voice clone from local storage and remove DB profile."""
    try:
        await get_tts_service().delete_voice(voice_id)
    except Exception as exc:
        logger.warning(f"TTS delete failed (may already be deleted): {exc}")

    try:
        db = await get_db()
        repo = VoiceProfileRepository(db)
        await repo.delete(voice_id)
    except Exception as exc:
        logger.warning(f"DB profile delete skipped (no MongoDB?): {exc}")

    return {"message": f"Voice {voice_id} deleted"}
