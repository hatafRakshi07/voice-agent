// Shared TypeScript types

export type CallStatus =
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer";

export interface Call {
  _id?: string;
  call_sid: string;
  from_number: string;
  to_number: string;
  status: CallStatus;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  voice_id?: string;
  summary?: string;
  turn_count: number;
}

export interface ConversationTurn {
  _id?: string;
  call_sid: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  confidence?: number;
  latency_ms?: number;
}

export interface Conversation {
  call_sid: string;
  summary?: string;
  turns: ConversationTurn[];
}

export interface DashboardStats {
  total_calls: number;
  completed_calls: number;
  active_calls: number;
  avg_duration_seconds: number;
}

/** Local XTTS-v2 voice profile */
export interface VoiceProfile {
  voice_id: string;
  name: string;
  description?: string;
  reference_wav?: string;
  sample_count?: number;
}

/** Realtime model status */
export interface ModelStatus {
  whisper: { ready: boolean; model: string; device: string };
  xtts: { ready: boolean };
  ollama: { ready: boolean; host: string; model: string; available_models: string[] };
}

