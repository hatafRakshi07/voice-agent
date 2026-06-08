"""
recording_routes.py
───────────────────
REST endpoints for accessing call recordings.

  GET  /api/recordings/{call_id}           — list recordings for a call
  GET  /api/recordings/{call_id}/{filename} — stream a specific WAV file
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.utils.logger import logger

router = APIRouter()

RECORDINGS_DIR = Path(settings.RECORDINGS_DIR)


@router.get("/{call_id}")
async def list_recordings(call_id: str):
    """Return metadata for all WAV files recorded during `call_id`."""
    rec_dir = RECORDINGS_DIR / call_id
    if not rec_dir.exists():
        return {"call_id": call_id, "files": []}

    files = []
    for f in sorted(rec_dir.iterdir()):
        if f.suffix == ".wav":
            files.append(
                {
                    "name": f.name,
                    "size_bytes": f.stat().st_size,
                    "url": f"/api/recordings/{call_id}/{f.name}",
                }
            )
    return {"call_id": call_id, "files": files}


@router.get("/{call_id}/{filename}")
async def get_recording(call_id: str, filename: str):
    """Stream a WAV recording file."""
    # Sanitise filename to prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not filename.endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are served")

    wav_path = RECORDINGS_DIR / call_id / filename
    if not wav_path.exists():
        raise HTTPException(status_code=404, detail="Recording not found")

    return FileResponse(
        str(wav_path),
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
