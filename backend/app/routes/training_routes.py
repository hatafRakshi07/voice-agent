"""
training_routes.py
──────────────────
REST endpoints for managing Whisper fine-tuning jobs and trained models.

  POST   /api/training/whisper/start          — upload dataset ZIP, begin training
  GET    /api/training/whisper/jobs           — list all jobs
  GET    /api/training/whisper/jobs/{job_id}  — poll a specific job
  GET    /api/training/whisper/models         — list fine-tuned models
  POST   /api/training/whisper/activate/{name} — set as active STT model
  DELETE /api/training/whisper/models/{name}  — delete a fine-tuned model
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.stt.trainer import (
    TrainingConfig,
    start_training_job,
    get_job,
    list_jobs,
    list_trained_models,
    delete_trained_model,
    MODELS_DIR,
)
from app.utils.logger import logger

router = APIRouter()

# ─── Max dataset size: 500 MB ─────────────────────────────────────────────────
MAX_DATASET_BYTES = 500 * 1024 * 1024


# ─── Start a training job ─────────────────────────────────────────────────────

@router.post("/whisper/start")
async def start_whisper_training(
    model_name: str = Form(..., description="Unique name for this fine-tuned model"),
    base_model: str = Form("small", description="tiny | base | small | medium"),
    language: str = Form("en", description="ISO-639-1 language code, e.g. hi, fr, de"),
    num_train_epochs: int = Form(3, ge=1, le=20),
    learning_rate: float = Form(1e-5, gt=0),
    per_device_train_batch_size: int = Form(4, ge=1, le=32),
    gradient_accumulation_steps: int = Form(2, ge=1),
    warmup_steps: int = Form(50, ge=0),
    dataset: UploadFile = File(
        ..., description="ZIP archive containing metadata.csv + audio/ folder"
    ),
):
    """
    Upload a labelled audio dataset and start a Whisper fine-tuning job.

    **Dataset ZIP structure:**
    ```
    dataset.zip/
      audio/
        001.wav
        002.wav
        ...
      metadata.csv     ← columns: audio_file, transcript
    ```
    You may also use ``metadata.jsonl`` (``{"audio_file": ..., "transcript": ...}``).
    """
    if not dataset.filename or not dataset.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="dataset must be a .zip file")

    zip_bytes = await dataset.read()
    if len(zip_bytes) > MAX_DATASET_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Dataset exceeds 500 MB limit ({len(zip_bytes) // 1024 // 1024} MB received)",
        )

    if base_model not in ("tiny", "base", "small", "medium"):
        raise HTTPException(
            status_code=400,
            detail="base_model must be one of: tiny, base, small, medium",
        )

    config = TrainingConfig(
        base_model=base_model,
        language=language,
        num_train_epochs=num_train_epochs,
        learning_rate=learning_rate,
        per_device_train_batch_size=per_device_train_batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        warmup_steps=warmup_steps,
    )

    try:
        job_id = start_training_job(
            zip_bytes=zip_bytes,
            model_name=model_name.strip(),
            config=config,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Failed to start training job: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to start job: {exc}")

    return {
        "job_id":     job_id,
        "model_name": model_name,
        "status":     "queued",
        "message":    "Training job queued — poll /jobs/{job_id} for progress",
    }


# ─── Job status ───────────────────────────────────────────────────────────────

@router.get("/whisper/jobs")
async def get_all_jobs():
    """List all training jobs (running, done, failed)."""
    return {"jobs": list_jobs(), "count": len(list_jobs())}


@router.get("/whisper/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Poll the status of a specific training job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


# ─── Trained models ───────────────────────────────────────────────────────────

@router.get("/whisper/models")
async def get_trained_models():
    """List all successfully fine-tuned Whisper models."""
    models = list_trained_models()
    return {"models": models, "count": len(models)}


class ActivateRequest(BaseModel):
    device: str = "cpu"
    compute_type: str = "int8"


@router.post("/whisper/activate/{model_name}")
async def activate_model(model_name: str, body: ActivateRequest = ActivateRequest()):
    """
    Hot-swap the running Whisper engine to use a fine-tuned model.

    The model is loaded in a background thread; the endpoint returns immediately.
    Check ``/health`` to confirm the engine is ready.
    """
    model_dir = MODELS_DIR / model_name
    if not model_dir.exists():
        raise HTTPException(
            status_code=404, detail=f"Model '{model_name}' not found"
        )

    from app.stt.whisper_engine import get_whisper_engine  # noqa: PLC0415
    import asyncio  # noqa: PLC0415

    engine = get_whisper_engine(
        model_size=str(model_dir),   # pass local path instead of size string
        device=body.device,
        compute_type=body.compute_type,
        force_reload=True,
    )

    asyncio.create_task(engine.load())

    return {
        "message": f"Activating '{model_name}' — engine will be ready shortly",
        "model_path": str(model_dir),
    }


@router.delete("/whisper/models/{model_name}")
async def remove_trained_model(model_name: str):
    """Permanently delete a fine-tuned Whisper model from disk."""
    try:
        delete_trained_model(model_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": f"Model '{model_name}' deleted"}
