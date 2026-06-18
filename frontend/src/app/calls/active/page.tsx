"use client";

import { useState, useEffect } from "react";
import type { TranscriptMessage } from "@/lib/types";

const DEMO_CALL = {
  id: "active-1",
  agentName: "Priya",
  callerName: "Rahul Sharma",
  callerNumber: "+91 98765 43210",
  direction: "incoming" as const,
  startTime: new Date().toISOString(),
};

const DEMO_TRANSCRIPT: TranscriptMessage[] = [
  { id: "1", speaker: "ai", text: "Namaste! Main Priya hun. Aaj main aapki kaise madad kar sakti hun?", timestamp: new Date(Date.now() - 45000).toISOString(), confidence: 1 },
  { id: "2", speaker: "customer", text: "Mujhe apna subscription renew karna hai.", timestamp: new Date(Date.now() - 38000).toISOString(), confidence: 0.96 },
  { id: "3", speaker: "ai", text: "Zaroor! Aapka current plan expire hone wala hai. Main aapko renewal options dikhata hun.", timestamp: new Date(Date.now() - 30000).toISOString(), confidence: 1, latencyMs: 820 },
  { id: "4", speaker: "customer", text: "Haan, annual plan mein upgrade karna chahta hun.", timestamp: new Date(Date.now() - 22000).toISOString(), confidence: 0.98 },
  { id: "5", speaker: "ai", text: "Annual plan ke saath aapko 20% ki savings hogi – sirf ₹4,999/year. Kya main process start karun?", timestamp: new Date(Date.now() - 14000).toISOString(), confidence: 1, latencyMs: 760 },
];

type AiStatus = "listening" | "thinking" | "speaking" | "idle";

function AiStatusIndicator({ status }: { status: AiStatus }) {
  const configs = {
    listening: { color: "bg-blue-500", label: "Listening", pulse: true },
    thinking: { color: "bg-amber-500", label: "Thinking…", pulse: true },
    speaking: { color: "bg-[#E40443]", label: "Speaking", pulse: true },
    idle: { color: "bg-gray-400", label: "Idle", pulse: false },
  };
  const c = configs[status];
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {c.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.color} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.color}`} />
      </span>
      <span className="text-xs font-medium text-gray-600">{c.label}</span>
    </div>
  );
}

function WaveBar({ delay }: { delay: number }) {
  return (
    <div
      className="w-1 rounded-full bg-[#E40443] animate-pulse"
      style={{ height: Math.random() * 24 + 8, animationDelay: `${delay}ms` }}
    />
  );
}

export default function ActiveCallPage() {
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>(DEMO_TRANSCRIPT);
  const [aiStatus, setAiStatus] = useState<AiStatus>("listening");
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  // Tick timer
  useEffect(() => {
    const start = Date.now() - 47000;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate AI status for demo
  useEffect(() => {
    const statuses: AiStatus[] = ["listening", "thinking", "speaking", "listening", "idle", "listening"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % statuses.length;
      setAiStatus(statuses[i]);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-full bg-[#f5f5f5] px-8 py-8 anim-fade-up">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Live indicator banner ─────────────────── */}
        <div className="flex items-center gap-3 bg-[#140609] text-white rounded-2xl px-6 py-4 shadow-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E40443]" />
          </span>
          <p className="text-sm font-semibold">Live Call in Progress</p>
          <div className="ml-auto flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              {[0, 80, 160, 240, 320].map(d => <WaveBar key={d} delay={d} />)}
            </div>
            <p className="font-mono text-xl font-bold text-[#E40443]">{formatTime(elapsed)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Left: Caller info + controls ─────── */}
          <div className="space-y-4">
            {/* Caller card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E40443]/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E40443"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{DEMO_CALL.callerName}</p>
                  <p className="text-xs text-gray-400 font-mono">{DEMO_CALL.callerNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">Agent</p>
                  <p className="font-semibold text-gray-700">{DEMO_CALL.agentName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">Direction</p>
                  <p className="font-semibold text-gray-700 capitalize">{DEMO_CALL.direction}</p>
                </div>
              </div>
            </div>

            {/* AI status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
              <p className="text-xs text-gray-400 font-medium mb-2">AI Status</p>
              <AiStatusIndicator status={aiStatus} />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">Avg Latency</p>
                <p className="text-xs font-semibold text-emerald-600">790ms</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
              <p className="text-xs text-gray-400 font-medium mb-3">Call Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsMuted(m => !m)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${
                    isMuted ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isMuted
                      ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8"/></>
                      : <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8"/></>
                    }
                  </svg>
                  {isMuted ? "Unmute" : "Mute"}
                </button>

                <button
                  onClick={() => setIsOnHold(h => !h)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${
                    isOnHold ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  {isOnHold ? "Resume" : "Hold"}
                </button>
              </div>

              <button className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91"/>
                  <line x1="23" y1="1" x2="1" y2="23"/>
                </svg>
                End Call
              </button>
            </div>
          </div>

          {/* ── Right: Live transcript ────────────── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 480 }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Live Transcript</p>
                <p className="text-xs text-gray-400 mt-0.5">{transcript.length} messages</p>
              </div>
              <AiStatusIndicator status={aiStatus} />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {transcript.map(msg => {
                const isAI = msg.speaker === "ai";
                return (
                  <div key={msg.id} className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAI ? "bg-[#E40443]/10 text-[#E40443]" : "bg-gray-100 text-gray-600"
                    }`}>
                      {isAI ? "AI" : "C"}
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isAI ? "bg-[#E40443] text-white rounded-tl-sm" : "bg-gray-100 text-gray-800 rounded-tr-sm"
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      {msg.latencyMs && (
                        <p className={`text-[10px] mt-1 ${isAI ? "text-white/60" : "text-gray-400"}`}>
                          {msg.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Typing indicator */}
              {aiStatus === "thinking" && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#E40443]/10 flex items-center justify-center text-xs font-bold text-[#E40443]">AI</div>
                  <div className="bg-[#E40443]/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#E40443] animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
