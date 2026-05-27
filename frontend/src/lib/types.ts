// Shared TypeScript types for the dashboard

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

export interface VoiceProfile {
  _id?: string;
  name: string;
  elevenlabs_voice_id: string;
  description?: string;
  is_default: boolean;
  created_at: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  is_saved?: boolean;
  preview_url?: string;
}
