import type {
  Call, Conversation, DashboardStats, Analytics, VoiceProfile,
  ModelStatus, TrainingJob, TrainedModel, RecordingFile,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} -> ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export const getStats = (): Promise<DashboardStats> =>
  apiFetch("/api/dashboard/stats");

export const getAnalytics = (days = 30): Promise<Analytics> =>
  apiFetch(`/api/dashboard/analytics?days=${days}`);

// ─── Calls ────────────────────────────────────────────────────────────────
export const getCalls = (skip = 0, limit = 50): Promise<Call[]> =>
  apiFetch(`/api/calls?skip=${skip}&limit=${limit}`);

export const getActiveCalls = (): Promise<Call[]> =>
  apiFetch("/api/calls/active");

export const getCall = (callId: string): Promise<Call> =>
  apiFetch(`/api/calls/${callId}`);

export const getConversation = (callId: string): Promise<Conversation> =>
  apiFetch(`/api/calls/${callId}/conversation`);

// ─── Recordings ───────────────────────────────────────────────────────────
export const getRecordings = (
  callId: string
): Promise<{ call_id: string; files: RecordingFile[] }> =>
  apiFetch(`/api/recordings/${callId}`);

// ─── Voices (local XTTS) ─────────────────────────────────────────────────
export const getVoices = (): Promise<{ voices: VoiceProfile[]; count: number }> =>
  apiFetch("/api/voices");

export const setDefaultVoice = (voiceId: string): Promise<{ message: string }> =>
  apiFetch(`/api/voices/${voiceId}/default`, { method: "POST" });

export const deleteVoice = (voiceId: string): Promise<{ message: string }> =>
  apiFetch(`/api/voices/${voiceId}`, { method: "DELETE" });

export function getVoiceSynthesizeUrl(
  voiceId: string,
  text = "Hello! This is a test of your cloned voice. How does it sound?",
  language = "en"
): string {
  const params = new URLSearchParams({ text, language });
  return `${BASE}/api/voices/${voiceId}/synthesize?${params}`;
}

export async function cloneVoice(
  name: string,
  description: string,
  files: File[]
): Promise<{ voice_id: string; name: string }> {
  const form = new FormData();
  form.append("name", name);
  form.append("description", description);
  files.forEach((f) => form.append("files", f));

  const res = await fetch(`${BASE}/api/voices/clone`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clone failed: ${text}`);
  }
  return res.json();
}

// ─── Model status ─────────────────────────────────────────────────────────
export const getModelStatus = (): Promise<ModelStatus> =>
  apiFetch("/ws/status");

// ─── Whisper training ─────────────────────────────────────────────────────
export async function startWhisperTraining(
  file: File,
  opts: {
    model_name: string;
    base_model: string;
    language: string;
    num_train_epochs: number;
    learning_rate: number;
    per_device_train_batch_size: number;
    gradient_accumulation_steps: number;
    warmup_steps: number;
  }
): Promise<TrainingJob> {
  const form = new FormData();
  form.append("dataset", file);
  Object.entries(opts).forEach(([k, v]) => form.append(k, String(v)));
  const res = await fetch(`${BASE}/api/training/whisper/start`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Training start failed: ${text}`);
  }
  return res.json();
}

export const getTrainingJobs = (): Promise<{ jobs: TrainingJob[]; count: number }> =>
  apiFetch("/api/training/whisper/jobs");

export const getTrainingJob = (jobId: string): Promise<TrainingJob> =>
  apiFetch(`/api/training/whisper/jobs/${jobId}`);

export const getTrainedModels = (): Promise<{ models: TrainedModel[]; count: number }> =>
  apiFetch("/api/training/whisper/models");

export const activateTrainedModel = (
  modelName: string
): Promise<{ message: string; model_path: string }> =>
  apiFetch(`/api/training/whisper/activate/${modelName}`, { method: "POST" });

export const deleteTrainedModel = (modelName: string): Promise<{ message: string }> =>
  apiFetch(`/api/training/whisper/models/${modelName}`, { method: "DELETE" });

