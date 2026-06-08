// Shared TypeScript types

export type CallStatus =
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer";

export interface Call {
  id?: number;
  call_id: string;
  phone_number: string;
  direction: string;
  status: CallStatus;
  voice_id?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  recording_path?: string;
  summary?: string;
  turn_count: number;
}

export interface ConversationTurn {
  id?: number;
  call_id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  confidence?: number;
  latency_ms?: number;
}

export interface Conversation {
  call_id: string;
  summary?: string;
  turns: ConversationTurn[];
}

export interface DashboardStats {
  total_calls: number;
  completed_calls: number;
  active_calls: number;
  avg_duration_seconds: number;
}

export interface DailyStats {
  day: string;
  total: number;
  completed: number;
  avg_duration: number;
}

export interface CommonPhrase {
  content: string;
  frequency: number;
}

export interface Analytics {
  daily: DailyStats[];
  common_phrases: CommonPhrase[];
}

/** Local XTTS-v2 voice profile */
export interface VoiceProfile {
  voice_id: string;
  name: string;
  description?: string;
  reference_wav?: string;
  sample_count?: number;
  is_default?: boolean;
}

/** Realtime model status */
export interface ModelStatus {
  whisper: { ready: boolean; model: string; device: string };
  xtts: { ready: boolean };
  /** Active LLM provider status */
  llm: {
    provider: "ollama" | "gemini" | string;
    ready: boolean;
    model: string;
    api_key_set?: boolean;   // Gemini only
    host?: string;            // Ollama only
  };
  /** Kept for backward compatibility */
  ollama: { ready: boolean; host: string; model: string; available_models: string[] };
  telephony_provider?: string;
  vad?: "silero" | "webrtc";
}

export interface RecordingFile {
  name: string;
  size_bytes: number;
  url: string;
}

// ── Whisper training ──────────────────────────────────────────────────────────

export type TrainingStatus = "queued" | "running" | "done" | "failed";

export interface TrainingJob {
  job_id: string;
  model_name: string;
  status: TrainingStatus;
  progress: number;
  message: string;
  base_model?: string;
  language?: string;
  ct2_path?: string;
}

export interface TrainedModel {
  model_name: string;
  base_model: string;
  language: string;
  sample_count: number;
  epochs: number;
  ct2_path: string;
  job_id: string;
}

