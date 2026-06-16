"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import WaveformVisualizer from "./WaveformVisualizer";
import ConversationHistory, { ConversationTurnLocal } from "./ConversationHistory";

const WS_URL =
  (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000") + "/ws/voice";

type AgentStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "error";

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  listening: "Listening…",
  processing: "Transcribing…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  error: "Error",
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "text-slate-400",
  connecting: "text-yellow-400",
  listening: "text-emerald-400",
  processing: "text-blue-400",
  thinking: "text-purple-400",
  speaking: "text-indigo-400",
  error: "text-red-400",
};

interface Props {
  voiceId?: string;
  language?: string;
}

export default function VoiceCall({ voiceId, language = "en" }: Props) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [turns, setTurns] = useState<ConversationTurnLocal[]>([]);
  const [currentToken, setCurrentToken] = useState("");
  const [micData, setMicData] = useState<Float32Array | undefined>();
  const [errorMsg, setErrorMsg] = useState("");

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const responseBufferRef = useRef("");
  const isConnectedRef = useRef(false);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const stopMic = useCallback(() => {
    workletNodeRef.current?.port.postMessage({ type: "stop" });
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    stopMic();
    wsRef.current?.close();
    wsRef.current = null;
    isConnectedRef.current = false;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setStatus("idle");
    setCurrentToken("");
  }, [stopMic]);

  useEffect(() => () => disconnect(), [disconnect]);

  // ── Audio playback queue ───────────────────────────────────────────────────

  const playNextChunk = useCallback(() => {
    if (!audioCtxRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const buf = audioQueueRef.current.shift()!;
    const src = audioCtxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtxRef.current.destination);
    src.onended = playNextChunk;
    src.start();
    sourceNodeRef.current = src;
  }, []);

  const enqueueAudio = useCallback(
    async (base64wav: string) => {
      if (!audioCtxRef.current) return;
      try {
        const bytes = Uint8Array.from(atob(base64wav), (c) => c.charCodeAt(0));
        const buffer = await audioCtxRef.current.decodeAudioData(bytes.buffer);
        audioQueueRef.current.push(buffer);
        if (!isPlayingRef.current) playNextChunk();
      } catch (e) {
        console.warn("[Audio] Decode failed:", e);
      }
    },
    [playNextChunk]
  );

  const stopAudio = useCallback(() => {
    try {
      sourceNodeRef.current?.stop();
    } catch (_) {}
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // ── WebSocket message handler ──────────────────────────────────────────────

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "ready":
        case "listening":
          setStatus("listening");
          setCurrentToken("");
          break;

        case "status":
          // Keep current status, just log
          break;

        case "transcript":
          if (msg.is_final && typeof msg.text === "string" && msg.text.trim()) {
            setTurns((prev) => [
              ...prev,
              { role: "user", text: msg.text as string, timestamp: Date.now() },
            ]);
          }
          setStatus("thinking");
          break;

        case "thinking":
          setStatus("thinking");
          responseBufferRef.current = "";
          setCurrentToken("");
          break;

        case "response_token":
          if (typeof msg.token === "string") {
            responseBufferRef.current += msg.token;
            setCurrentToken(responseBufferRef.current);
          }
          break;

        case "speaking":
          setStatus("speaking");
          break;

        case "audio_chunk":
          if (typeof msg.data === "string") {
            enqueueAudio(msg.data);
          }
          break;

        case "done":
          // Finalise assistant turn from token buffer
          if (responseBufferRef.current.trim()) {
            setTurns((prev) => [
              ...prev,
              {
                role: "assistant",
                text: responseBufferRef.current.trim(),
                timestamp: Date.now(),
              },
            ]);
            responseBufferRef.current = "";
            setCurrentToken("");
          }
          setStatus("listening");
          break;

        case "error":
          setErrorMsg(String(msg.message ?? "Unknown error"));
          setStatus("error");
          break;
      }
    },
    [enqueueAudio]
  );

  // ── Connect / start call ───────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (isConnectedRef.current) return;
    setErrorMsg("");
    setStatus("connecting");

    // Create AudioContext
    audioCtxRef.current = new AudioContext({ sampleRate: 16000 });

    // Request mic access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      setErrorMsg("Microphone access denied. Please allow mic permission.");
      setStatus("error");
      return;
    }
    streamRef.current = stream;

    // Load AudioWorklet
    try {
      await audioCtxRef.current.audioWorklet.addModule("/audio-processor.js");
    } catch (e) {
      setErrorMsg("AudioWorklet failed to load.");
      setStatus("error");
      return;
    }

    // Build WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      isConnectedRef.current = true;

      // Send initial config
      ws.send(JSON.stringify({ type: "config", voice_id: voiceId ?? null, language }));

      // Wire up AudioWorklet → WebSocket
      const source = audioCtxRef.current!.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtxRef.current!, "voice-recorder-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (e.data.type !== "audio" || !isConnectedRef.current) return;
        const chunk = e.data.data as Float32Array;
        setMicData(chunk);

        // Encode as base64 and send (loop to avoid call-stack overflow on large buffers)
        const bytes = new Uint8Array(chunk.buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio", data: b64, sample_rate: 16000 }));
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioCtxRef.current!.destination);
      setStatus("listening");
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onerror = () => {
      setErrorMsg("WebSocket connection error. Is the backend running?");
      setStatus("error");
    };

    ws.onclose = () => {
      if (isConnectedRef.current) {
        isConnectedRef.current = false;
        setStatus("idle");
      }
    };
  }, [voiceId, language, handleMessage]);

  const interruptAI = useCallback(() => {
    stopAudio();
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
    setStatus("listening");
    setCurrentToken("");
  }, [stopAudio]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  const isActive = status === "speaking";
  const isListening = status === "listening";
  const isConnected = status !== "idle" && status !== "error";

  const statusColor = {
    idle: "bg-slate-600",
    connecting: "bg-amber-400 animate-pulse",
    listening: "bg-emerald-400",
    processing: "bg-blue-400 animate-pulse",
    thinking: "bg-violet-400 animate-pulse",
    speaking: "bg-indigo-400",
    error: "bg-red-400",
  }[status];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${statusColor.split(' ')[0]}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`} />
          </span>
          <span className={`text-sm font-semibold ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          {status === "thinking" && (
            <div className="flex items-center gap-1 ml-1">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
          )}
        </div>

        {isConnected && (
          <button
            onClick={interruptAI}
            className="text-xs text-slate-500 hover:text-white transition-colors border border-slate-700/60 hover:border-slate-500 rounded-lg px-3 py-1.5 bg-slate-900/40 hover:bg-slate-800/60"
          >
            ⏹ Interrupt
          </button>
        )}
      </div>

      {/* ── Waveform ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-800/60 bg-slate-950/60">
        <WaveformVisualizer
          isActive={isActive}
          isListening={isListening}
          audioData={micData}
        />
      </div>

      {/* ── Control button ── */}
      <div className="flex justify-center">
        {!isConnected ? (
          <button
            onClick={startCall}
            className="voice-call-btn-start flex items-center gap-3 px-8 py-3.5 rounded-2xl font-semibold text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
            Start Conversation
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="voice-call-btn-stop flex items-center gap-3 px-8 py-3.5 rounded-2xl font-semibold text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="3"/>
            </svg>
            End Conversation
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="error-strip px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {errorMsg}
        </div>
      )}

      {/* ── Streaming token preview ── */}
      {currentToken && status === "thinking" && (
        <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl px-4 py-3 text-sm text-slate-400 italic leading-relaxed">
          <span className="text-violet-400 not-italic font-medium text-xs uppercase tracking-wider mr-2">Nova:</span>
          {currentToken}
          <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
        </div>
      )}

      {/* ── Conversation history ── */}
      <div className="h-72 overflow-y-auto rounded-2xl bg-slate-950/50 border border-slate-800/60 p-4 scroll-smooth">
        <ConversationHistory turns={turns} />
      </div>

    </div>
  );
}
