"""
voice_routes.py
────────────────
REST endpoints for managing local XTTS voice clones.

  GET    /api/voices              — list all locally cloned voices
  POST   /api/voices/clone        — upload samples, create offline voice clone
  POST   /api/voices/{id}/default — set as the default voice
  DELETE /api/voices/{id}         — delete a cloned voice
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.tts.xtts_engine import get_xtts_engine
from app.utils.logger import logger

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
@router.get("")
async def list_voices():
    """List all locally cloned XTTS voice profiles."""
    xtts = get_xtts_engine()
    voices = xtts.list_voices()
    return {"voices": voices, "count": len(voices)}


# ─────────────────────────────────────────────────────────────────────────────
@router.post("/clone")
async def clone_voice(
    name: str = Form(...),
    description: str = Form(""),
    files: list[UploadFile] = File(..., description="Audio samples (wav/mp3, ≤25 MB each)"),
):
    """
    Clone a voice from uploaded audio samples using Coqui XTTS-v2.

    - Upload 6–30 seconds of clean speech audio
    - WAV, MP3, FLAC, or OGG accepted
    - At least 1 sample required; up to 5 recommended
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one audio sample is required")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 samples allowed")

    samples: list[bytes] = []
    for f in files:
        data = await f.read()
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail=f"'{f.filename}' exceeds 25 MB limit"
            )
        samples.append(data)

    xtts = get_xtts_engine()
    if not xtts.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="XTTS model is still loading — please retry in a moment",
        )

    try:
        voice_id = await xtts.clone_voice(
            name=name.strip(),
            audio_files=samples,
            description=description.strip(),
        )
    except Exception as exc:
        logger.error(f"Voice clone failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Clone failed: {exc}")

    return {
        "voice_id": voice_id,
        "name": name,
        "message": "Voice cloned successfully (local XTTS-v2)",
    }


# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{voice_id}/default")
async def set_default_voice(voice_id: str):
    """Set this voice as the default for new sessions."""
    from app.config import settings  # noqa: PLC0415
    # Verify voice exists
    xtts = get_xtts_engine()
    voices = xtts.list_voices()
    if not any(v["voice_id"] == voice_id for v in voices):
        raise HTTPException(status_code=404, detail=f"Voice '{voice_id}' not found")
    # Update singleton default
    xtts.default_voice_id = voice_id
    logger.info(f"[Voices] Default voice set to {voice_id}")
    return {"message": f"Voice {voice_id} set as default"}


# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{voice_id}")
async def delete_voice(voice_id: str):
    """Permanently delete a cloned voice from local storage."""
    xtts = get_xtts_engine()
    try:
        xtts.delete_voice(voice_id)
    except Exception as exc:
        logger.warning(f"Voice delete warning: {exc}")
    return {"message": f"Voice {voice_id} deleted"}
