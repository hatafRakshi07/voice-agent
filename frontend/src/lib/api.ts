import type { Call, Conversation, DashboardStats, VoiceProfile, ModelStatus } from "./types";

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

// ─── Dashboard ────────────────────────────────────────────────────────────────────────────────
export const getStats = (): Promise<DashboardStats> =>
  apiFetch("/api/dashboard/stats");

// ─── Calls ────────────────────────────────────────────────────────────────────────────────────
export const getCalls = (skip = 0, limit = 50): Promise<Call[]> =>
  apiFetch(`/api/calls?skip=${skip}&limit=${limit}`);

export const getActiveCalls = (): Promise<Call[]> =>
  apiFetch("/api/calls/active");

export const getCall = (callSid: string): Promise<Call> =>
  apiFetch(`/api/calls/${callSid}`);

export const getConversation = (callSid: string): Promise<Conversation> =>
  apiFetch(`/api/calls/${callSid}/conversation`);

// ─── Voices (local XTTS) ─────────────────────────────────────────────────────────────────
export const getVoices = (): Promise<{ voices: VoiceProfile[]; count: number }> =>
  apiFetch("/api/voices");

export const setDefaultVoice = (voiceId: string): Promise<{ message: string }> =>
  apiFetch(`/api/voices/${voiceId}/default`, { method: "POST" });

export const deleteVoice = (voiceId: string): Promise<{ message: string }> =>
  apiFetch(`/api/voices/${voiceId}`, { method: "DELETE" });

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

// ─── Model status ─────────────────────────────────────────────────────────────────────────────────
export const getModelStatus = (): Promise<ModelStatus> =>
  apiFetch("/ws/status");
