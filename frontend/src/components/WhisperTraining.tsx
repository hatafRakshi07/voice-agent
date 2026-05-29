"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TrainingJob, TrainedModel } from "@/lib/types";
import {
  startWhisperTraining,
  getTrainingJob,
  getTrainedModels,
  activateTrainedModel,
  deleteTrainedModel,
} from "@/lib/api";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

function IconPlay({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconTrash({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, status }: { value: number; status: string }) {
  const color =
    status === "done"   ? "bg-emerald-500" :
    status === "failed" ? "bg-red-500"     : "bg-indigo-500";

  return (
    <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: TrainingJob }) {
  const statusColor =
    job.status === "done"    ? "text-emerald-400" :
    job.status === "failed"  ? "text-red-400"     :
    job.status === "running" ? "text-indigo-400"  : "text-slate-400";

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{job.model_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {job.base_model} · {job.language} · job {job.job_id}
          </p>
        </div>
        <span className={`text-xs font-medium uppercase tracking-wider ${statusColor}`}>
          {job.status}
        </span>
      </div>

      <ProgressBar value={job.progress} status={job.status} />

      <p className="text-xs text-slate-400">{job.message}</p>
    </div>
  );
}

// ── Trained model card ────────────────────────────────────────────────────────

function ModelCard({
  model,
  onActivate,
  onDelete,
}: {
  model: TrainedModel;
  onActivate: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [activating, setActivating] = useState(false);
  const [activated, setActivated]   = useState(false);

  async function handleActivate() {
    setActivating(true);
    try {
      await onActivate(model.model_name);
      setActivated(true);
      setTimeout(() => setActivated(false), 3000);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="glass rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{model.model_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Base: whisper-{model.base_model} · Lang: {model.language} ·{" "}
          {model.sample_count} samples · {model.epochs} epoch{model.epochs !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleActivate}
          disabled={activating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activated
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
          } disabled:opacity-50`}
        >
          {activated ? <IconCheck size={13} /> : <IconPlay size={13} />}
          {activated ? "Activated" : activating ? "Loading…" : "Activate"}
        </button>

        <button
          onClick={() => onDelete(model.model_name)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete model"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WhisperTraining() {
  // ── Form state ────────────────────────────────────────────────────────────
  const [file,          setFile]          = useState<File | null>(null);
  const [modelName,     setModelName]     = useState("");
  const [baseModel,     setBaseModel]     = useState("small");
  const [language,      setLanguage]      = useState("en");
  const [epochs,        setEpochs]        = useState(3);
  const [learningRate,  setLearningRate]  = useState(1e-5);
  const [batchSize,     setBatchSize]     = useState(4);
  const [gradAccum,     setGradAccum]     = useState(2);
  const [warmupSteps,   setWarmupSteps]   = useState(50);
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  // ── Jobs & models ─────────────────────────────────────────────────────────
  const [activeJobs,    setActiveJobs]    = useState<TrainingJob[]>([]);
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load models on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchModels();
  }, []);

  // ── Poll active jobs ──────────────────────────────────────────────────────
  useEffect(() => {
    const pending = activeJobs.filter(
      (j) => j.status === "queued" || j.status === "running"
    );
    if (pending.length === 0) return;

    pollRef.current = setTimeout(async () => {
      const updated = await Promise.all(
        pending.map((j) => getTrainingJob(j.job_id).catch(() => j))
      );
      setActiveJobs((prev) =>
        prev.map((j) => updated.find((u) => u.job_id === j.job_id) ?? j)
      );
      const justDone = updated.filter((j) => j.status === "done");
      if (justDone.length > 0) fetchModels();
    }, 3000);

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [activeJobs]);

  const fetchModels = useCallback(async () => {
    try {
      const { models } = await getTrainedModels();
      setTrainedModels(models);
    } catch {
      // silently ignore if backend not ready
    }
  }, []);

  // ── File selection ────────────────────────────────────────────────────────
  function handleFile(f: File) {
    if (!f.name.endsWith(".zip")) {
      setError("Please upload a .zip archive");
      return;
    }
    setFile(f);
    setError(null);
    // Auto-suggest model name from filename
    if (!modelName) {
      setModelName(f.name.replace(/\.zip$/, "").replace(/[^a-zA-Z0-9_-]/g, "_"));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !modelName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const job = await startWhisperTraining(file, {
        model_name: modelName.trim(),
        base_model: baseModel,
        language,
        num_train_epochs: epochs,
        learning_rate: learningRate,
        per_device_train_batch_size: batchSize,
        gradient_accumulation_steps: gradAccum,
        warmup_steps: warmupSteps,
      });

      setActiveJobs((prev) => [job, ...prev]);
      setSuccess(`Training job started! Job ID: ${job.job_id}`);
      setFile(null);
      setModelName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start training");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Activate / delete ─────────────────────────────────────────────────────
  async function handleActivate(name: string) {
    await activateTrainedModel(name);
    setSuccess(`Model '${name}' activated — STT engine switching…`);
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete model '${name}'? This cannot be undone.`)) return;
    try {
      await deleteTrainedModel(name);
      setTrainedModels((prev) => prev.filter((m) => m.model_name !== name));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Upload form ─────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">
          Fine-tune Whisper
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Upload a labelled dataset ZIP to adapt Whisper to your language or accent.
          Training runs locally — no data leaves your server.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-indigo-400 bg-indigo-500/10"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/10 hover:border-white/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="flex flex-col items-center gap-2">
              {file ? (
                <>
                  <span className="text-emerald-400 text-2xl">✓</span>
                  <p className="text-sm text-emerald-400 font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                  </p>
                </>
              ) : (
                <>
                  <span className="text-slate-500"><IconUpload size={32} /></span>
                  <p className="text-sm text-slate-300 font-medium">
                    Drop dataset ZIP here or click to browse
                  </p>
                  <p className="text-xs text-slate-600">
                    Must contain <code className="text-slate-400">metadata.csv</code> +{" "}
                    <code className="text-slate-400">audio/</code> folder
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Core settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Model name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. hindi_v1"
                pattern="[a-zA-Z0-9_-]+"
                title="Alphanumeric, hyphens, underscores only"
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Base model</label>
              <select
                value={baseModel}
                onChange={(e) => setBaseModel(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="tiny">tiny (39M)</option>
                <option value="base">base (74M)</option>
                <option value="small">small (244M)</option>
                <option value="medium">medium (769M)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value.toLowerCase())}
                placeholder="en, hi, fr, de…"
                maxLength={5}
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Epochs</label>
              <input
                type="number"
                value={epochs}
                min={1}
                max={20}
                onChange={(e) => setEpochs(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Learning rate</label>
              <input
                type="number"
                value={learningRate}
                step="1e-6"
                min="1e-7"
                max="1e-3"
                onChange={(e) => setLearningRate(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showAdvanced ? "▲ Hide" : "▼ Show"} advanced options
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Batch size / device</label>
                <input
                  type="number"
                  value={batchSize}
                  min={1}
                  max={32}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gradient accum. steps</label>
                <input
                  type="number"
                  value={gradAccum}
                  min={1}
                  onChange={(e) => setGradAccum(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Warmup steps</label>
                <input
                  type="number"
                  value={warmupSteps}
                  min={0}
                  onChange={(e) => setWarmupSteps(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          )}

          {/* Dataset format hint */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="text-slate-400 font-medium mb-2">Expected ZIP structure</p>
            <pre className="text-slate-500 leading-relaxed">{`dataset.zip/
  audio/
    001.wav
    002.wav
    ...
  metadata.csv    ← columns: audio_file, transcript`}
            </pre>
          </div>

          {/* Status messages */}
          {error   && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">{success}</p>}

          <button
            type="submit"
            disabled={submitting || !file || !modelName.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold text-white transition-all"
          >
            {submitting ? "Starting…" : "Start Training"}
          </button>
        </form>
      </div>

      {/* ── Active jobs ──────────────────────────────────────────────────── */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Active Jobs</h3>
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <JobCard key={job.job_id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* ── Fine-tuned models ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Fine-tuned Models</h3>
          <button
            onClick={fetchModels}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {trainedModels.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-slate-600 text-sm">
            No fine-tuned models yet. Upload a dataset and start training.
          </div>
        ) : (
          <div className="space-y-3">
            {trainedModels.map((m) => (
              <ModelCard
                key={m.model_name}
                model={m}
                onActivate={handleActivate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
