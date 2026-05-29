"""
trainer.py
──────────
Whisper fine-tuning pipeline for custom language / accent adaptation.

Dataset format (ZIP archive):
  dataset.zip/
    audio/                ← WAV or MP3 files (16 kHz mono recommended)
      001.wav
      002.wav
    metadata.csv          ← columns: audio_file, transcript
    OR metadata.jsonl     ← {"audio_file": "audio/001.wav", "transcript": "..."}

After training the model is converted to CTranslate2 format so faster-whisper
can load it directly with WhisperModel("/path/to/ct2_model").

Usage:
    from app.stt.trainer import WhisperTrainer, TrainingConfig, start_training_job

    job_id = start_training_job(
        zip_bytes, model_name="my_hindi_v1",
        config=TrainingConfig(base_model="small", language="hi", num_train_epochs=3)
    )
"""

import csv
import io
import json
import os
import shutil
import threading
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from app.utils.logger import logger

# ── Storage paths ─────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "whisper"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── In-memory job registry ────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


# ── Config ────────────────────────────────────────────────────────────────────

@dataclass
class TrainingConfig:
    """Hyper-parameters for a Whisper fine-tuning run."""
    base_model: str = "small"           # tiny | base | small | medium
    language: str = "en"               # ISO-639-1 language code
    num_train_epochs: int = 3
    learning_rate: float = 1e-5
    per_device_train_batch_size: int = 4
    gradient_accumulation_steps: int = 2
    warmup_steps: int = 50
    max_steps: int = -1                # -1 = derive from epochs
    fp16: bool = False                 # auto-enabled if CUDA available
    dataloader_num_workers: int = 0


# ── Job helpers ───────────────────────────────────────────────────────────────

def get_job(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def list_jobs() -> list[dict]:
    with _jobs_lock:
        return [dict(v) for v in _jobs.values()]


def list_trained_models() -> list[dict]:
    """Return metadata for every successfully fine-tuned model."""
    models: list[dict] = []
    for entry in MODELS_DIR.iterdir():
        meta_file = entry / "training_meta.json"
        if meta_file.exists():
            try:
                models.append(json.loads(meta_file.read_text()))
            except Exception:
                pass
    return models


def delete_trained_model(model_name: str) -> None:
    target = MODELS_DIR / model_name
    if not target.exists():
        raise FileNotFoundError(f"Model '{model_name}' not found")
    shutil.rmtree(target)


# ── Trainer class ─────────────────────────────────────────────────────────────

class WhisperTrainer:
    """
    Runs a complete Whisper fine-tuning job.

    Call ``run(zip_bytes)`` from a thread pool executor — it is synchronous.
    Progress is tracked in the in-memory ``_jobs`` dict keyed by ``job_id``.
    """

    def __init__(self, config: TrainingConfig, job_id: str, model_name: str):
        self.config = config
        self.job_id = job_id
        self.model_name = model_name

    # ── Public entry point ────────────────────────────────────────────────────

    def run(self, zip_bytes: bytes) -> str:
        """
        Full pipeline: extract → preprocess → train → convert.

        Returns the path to the CTranslate2 model directory.
        Raises on any error; the error is also recorded in the job registry.
        """
        self._update(status="running", progress=0, message="Extracting dataset…")

        work_dir = MODELS_DIR / f"_work_{self.job_id}"
        ct2_dir  = MODELS_DIR / self.model_name

        try:
            # ── Step 1: extract dataset ───────────────────────────────────
            audio_base, pairs = self._extract_dataset(zip_bytes, work_dir)
            logger.info(f"[Trainer:{self.job_id}] {len(pairs)} samples found")
            self._update(progress=5, message=f"Dataset loaded — {len(pairs)} samples")

            # ── Step 2: build HuggingFace Dataset ────────────────────────
            hf_dataset = self._build_hf_dataset(pairs, audio_base)
            self._update(progress=12, message="Audio preprocessing complete")

            # ── Step 3: fine-tune ────────────────────────────────────────
            hf_output = work_dir / "hf_output"
            self._train(hf_dataset, str(hf_output))
            self._update(progress=85, message="Converting to CTranslate2…")

            # ── Step 4: convert to faster-whisper format ─────────────────
            self._convert_to_ct2(str(hf_output), str(ct2_dir))

            # ── Step 5: persist metadata ──────────────────────────────────
            meta = {
                "model_name": self.model_name,
                "base_model": self.config.base_model,
                "language": self.config.language,
                "sample_count": len(pairs),
                "epochs": self.config.num_train_epochs,
                "ct2_path": str(ct2_dir),
                "job_id": self.job_id,
            }
            (ct2_dir / "training_meta.json").write_text(json.dumps(meta, indent=2))

            self._update(
                status="done", progress=100,
                message="Training complete ✓",
                ct2_path=str(ct2_dir),
            )
            logger.info(f"[Trainer:{self.job_id}] done → {ct2_dir}")
            return str(ct2_dir)

        except Exception as exc:
            logger.error(f"[Trainer:{self.job_id}] failed: {exc}", exc_info=True)
            self._update(status="failed", message=str(exc))
            raise
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    # ── Dataset extraction ────────────────────────────────────────────────────

    def _extract_dataset(
        self, zip_bytes: bytes, work_dir: Path
    ) -> tuple[Path, list[tuple[str, str]]]:
        """Unpack ZIP and parse audio_file→transcript pairs."""
        work_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            zf.extractall(work_dir)

        meta_csv   = next(work_dir.rglob("metadata.csv"),  None)
        meta_jsonl = next(work_dir.rglob("metadata.jsonl"), None)

        if meta_csv is None and meta_jsonl is None:
            raise ValueError(
                "Dataset ZIP must contain metadata.csv or metadata.jsonl"
            )

        base = (meta_csv or meta_jsonl).parent  # type: ignore[union-attr]
        pairs: list[tuple[str, str]] = []

        if meta_csv:
            with open(meta_csv, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    pairs.append((row["audio_file"].strip(), row["transcript"].strip()))
        else:
            with open(meta_jsonl, encoding="utf-8") as f:  # type: ignore[arg-type]
                for line in f:
                    line = line.strip()
                    if line:
                        obj = json.loads(line)
                        pairs.append(
                            (obj["audio_file"].strip(), obj["transcript"].strip())
                        )

        if not pairs:
            raise ValueError("metadata file contains no valid rows")

        return base, pairs

    # ── HuggingFace Dataset builder ───────────────────────────────────────────

    def _build_hf_dataset(
        self, pairs: list[tuple[str, str]], base: Path
    ):
        """Build a HuggingFace Dataset with audio + sentence columns."""
        from datasets import Dataset, Audio  # noqa: PLC0415

        records = [
            {"audio": str(base / audio_rel), "sentence": transcript}
            for audio_rel, transcript in pairs
        ]
        ds = Dataset.from_list(records)
        ds = ds.cast_column("audio", Audio(sampling_rate=16_000))
        return ds

    # ── Fine-tuning ───────────────────────────────────────────────────────────

    def _train(self, dataset, output_dir: str) -> None:
        import torch  # noqa: PLC0415
        from transformers import (  # noqa: PLC0415
            WhisperForConditionalGeneration,
            WhisperProcessor,
            Seq2SeqTrainer,
            Seq2SeqTrainingArguments,
            TrainerCallback,
            TrainerState,
            TrainerControl,
        )
        import evaluate  # noqa: PLC0415

        model_id = f"openai/whisper-{self.config.base_model}"
        logger.info(f"[Trainer:{self.job_id}] loading base model {model_id}")

        processor = WhisperProcessor.from_pretrained(
            model_id, language=self.config.language, task="transcribe"
        )
        model = WhisperForConditionalGeneration.from_pretrained(model_id)
        model.config.forced_decoder_ids = None
        model.config.suppress_tokens = []
        model.generation_config.language = self.config.language
        model.generation_config.task = "transcribe"

        # Feature extraction + tokenisation
        def prepare(batch):
            audio = batch["audio"]
            batch["input_features"] = processor.feature_extractor(
                audio["array"], sampling_rate=audio["sampling_rate"]
            ).input_features[0]
            batch["labels"] = processor.tokenizer(batch["sentence"]).input_ids
            return batch

        self._update(progress=15, message="Preprocessing features…")
        dataset = dataset.map(
            prepare,
            remove_columns=dataset.column_names,
            num_proc=1,
        )

        # Train / eval split (90 / 10)
        split = dataset.train_test_split(test_size=0.1, seed=42)
        train_ds, eval_ds = split["train"], split["test"]

        # ── Data collator ─────────────────────────────────────────────────
        class _Collator:
            def __init__(self, proc):
                self.proc = proc

            def __call__(self, features: list[dict]) -> dict:
                input_features = [
                    {"input_features": f["input_features"]} for f in features
                ]
                batch = self.proc.feature_extractor.pad(
                    input_features, return_tensors="pt"
                )
                label_features = [{"input_ids": f["labels"]} for f in features]
                labels_batch = self.proc.tokenizer.pad(
                    label_features, return_tensors="pt"
                )
                labels = labels_batch["input_ids"].masked_fill(
                    labels_batch.attention_mask.ne(1), -100
                )
                if (labels[:, 0] == self.proc.tokenizer.bos_token_id).all():
                    labels = labels[:, 1:]
                batch["labels"] = labels
                return batch

        collator = _Collator(processor)

        # ── Metrics ───────────────────────────────────────────────────────
        wer_metric = evaluate.load("wer")

        def compute_metrics(pred):
            pred_ids   = pred.predictions
            label_ids  = pred.label_ids
            label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
            pred_str  = processor.tokenizer.batch_decode(
                pred_ids, skip_special_tokens=True
            )
            label_str = processor.tokenizer.batch_decode(
                label_ids, skip_special_tokens=True
            )
            return {"wer": round(wer_metric.compute(
                predictions=pred_str, references=label_str
            ), 4)}

        # ── Progress callback ─────────────────────────────────────────────
        trainer_ref = self

        class _ProgressCallback(TrainerCallback):
            def on_log(
                self,
                args: Seq2SeqTrainingArguments,
                state: TrainerState,
                control: TrainerControl,
                logs: Optional[dict] = None,
                **kwargs: Any,
            ) -> None:
                if state.max_steps and state.max_steps > 0:
                    pct = int(18 + (state.global_step / state.max_steps) * 62)
                else:
                    pct = 18
                msg = f"Step {state.global_step}"
                if logs:
                    if "loss" in logs:
                        msg += f" — loss {logs['loss']:.4f}"
                    if "eval_wer" in logs:
                        msg += f" | WER {logs['eval_wer']:.4f}"
                trainer_ref._update(progress=pct, message=msg)

        cfg = self.config
        use_fp16 = cfg.fp16 and torch.cuda.is_available()

        training_args = Seq2SeqTrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=cfg.per_device_train_batch_size,
            gradient_accumulation_steps=cfg.gradient_accumulation_steps,
            learning_rate=cfg.learning_rate,
            warmup_steps=cfg.warmup_steps,
            num_train_epochs=cfg.num_train_epochs,
            max_steps=cfg.max_steps,
            gradient_checkpointing=True,
            fp16=use_fp16,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="wer",
            greater_is_better=False,
            predict_with_generate=True,
            generation_max_length=225,
            logging_steps=10,
            report_to="none",
            dataloader_num_workers=cfg.dataloader_num_workers,
            remove_unused_columns=False,
        )

        trainer = Seq2SeqTrainer(
            model=model,
            args=training_args,
            train_dataset=train_ds,
            eval_dataset=eval_ds,
            data_collator=collator,
            compute_metrics=compute_metrics,
            tokenizer=processor.feature_extractor,
            callbacks=[_ProgressCallback()],
        )

        logger.info(f"[Trainer:{self.job_id}] starting training…")
        trainer.train()
        trainer.save_model(output_dir)
        processor.save_pretrained(output_dir)
        logger.info(f"[Trainer:{self.job_id}] HF model saved → {output_dir}")

    # ── CTranslate2 conversion ────────────────────────────────────────────────

    def _convert_to_ct2(self, hf_dir: str, ct2_dir: str) -> None:
        """
        Convert a HuggingFace Whisper checkpoint to CTranslate2 format
        so it can be loaded by faster-whisper.
        """
        import subprocess  # noqa: PLC0415
        import sys          # noqa: PLC0415

        cmd = [
            sys.executable, "-m", "ctranslate2.tools.transformers",
            "--model",      hf_dir,
            "--output_dir", ct2_dir,
            "--quantization", "int8",
            "--force",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            # Fall back to the Python API (ctranslate2 >= 3.x)
            logger.warning(
                f"[Trainer:{self.job_id}] CLI convert failed, trying Python API: "
                f"{result.stderr[:300]}"
            )
            try:
                import ctranslate2  # noqa: PLC0415
                converter = ctranslate2.converters.TransformersConverter(
                    hf_dir,
                    low_cpu_mem_usage=True,
                )
                converter.convert(ct2_dir, quantization="int8", force=True)
            except Exception as exc:
                raise RuntimeError(
                    f"CTranslate2 conversion failed: {exc}\n"
                    f"CLI stderr: {result.stderr[:500]}"
                ) from exc

        logger.info(f"[Trainer:{self.job_id}] CTranslate2 model → {ct2_dir}")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _update(self, **kwargs: Any) -> None:
        with _jobs_lock:
            if self.job_id in _jobs:
                _jobs[self.job_id].update(kwargs)


# ── Public factory ────────────────────────────────────────────────────────────

def start_training_job(
    zip_bytes: bytes,
    model_name: str,
    config: TrainingConfig,
) -> str:
    """
    Register a job and launch training in a daemon thread.

    Returns the job_id immediately; poll ``get_job(job_id)`` for progress.
    """
    if not model_name.replace("-", "").replace("_", "").isalnum():
        raise ValueError("model_name must be alphanumeric (hyphens/underscores allowed)")

    if (MODELS_DIR / model_name).exists():
        raise ValueError(f"A model named '{model_name}' already exists")

    job_id = uuid.uuid4().hex[:12]
    with _jobs_lock:
        _jobs[job_id] = {
            "job_id":     job_id,
            "model_name": model_name,
            "status":     "queued",
            "progress":   0,
            "message":    "Queued",
            "base_model": config.base_model,
            "language":   config.language,
        }

    trainer = WhisperTrainer(config=config, job_id=job_id, model_name=model_name)

    def _worker() -> None:
        try:
            trainer.run(zip_bytes)
        except Exception:
            pass  # errors already logged + stored in job dict

    t = threading.Thread(target=_worker, daemon=True, name=f"whisper-train-{job_id}")
    t.start()
    return job_id
