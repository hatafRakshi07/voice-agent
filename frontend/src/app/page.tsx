"use client";

import { useEffect, useState } from "react";
import { getStats, getActiveCalls, getModelStatus } from "@/lib/api";
import type { DashboardStats, Call, ModelStatus } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import VoiceCall from "@/components/VoiceCall";
import VoiceUploader from "@/components/VoiceUploader";

function IcoMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  );
}
function IcoSignal() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="20" x2="1" y2="14"/><line x1="7" y1="20" x2="7" y2="10"/>
      <line x1="13" y1="20" x2="13" y2="4"/><line x1="19" y1="20" x2="19" y2="2"/>
    </svg>
  );
}
function IcoCpu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_calls: 0,
    completed_calls: 0,
    active_calls: 0,
    avg_duration_seconds: 0,
  });
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloner, setShowCloner] = useState(false);

  const fetchData = async () => {
    try {
      const [s, ms] = await Promise.all([getStats(), getModelStatus()]);
      setStats(s);
      setModelStatus(ms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, []);

  const modelsReady = modelStatus
    ? modelStatus.whisper.ready && modelStatus.xtts.ready && modelStatus.ollama.ready
    : false;

  return (
    <div className="min-h-full bg-scene px-6 py-8 space-y-8 anim-fade-up">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">
            Self-Hosted AI
          </p>
          <h1 className="text-3xl font-extrabold grad-text">Voice Agent</h1>
          <p className="text-slate-500 text-sm mt-1">
            Offline · Whisper STT · Ollama LLM · Coqui XTTS-v2
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 text-slate-400">
          <span className={`w-2 h-2 rounded-full ${modelsReady ? "bg-emerald-400 animate-pulse" : "bg-yellow-400"}`} />
          {modelsReady ? "All models ready" : "Loading models…"}
        </div>
      </div>

      {/* ── Model status pills ── */}
      {modelStatus && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: `Whisper (${modelStatus.whisper.model})`, ready: modelStatus.whisper.ready },
            { label: `Ollama (${modelStatus.ollama.model})`, ready: modelStatus.ollama.ready },
            { label: "XTTS-v2", ready: modelStatus.xtts.ready },
          ].map(({ label, ready }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                ready
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                  : "bg-yellow-950/40 border-yellow-800 text-yellow-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-emerald-400" : "bg-yellow-400 animate-pulse"}`} />
              {label}
              {ready ? " ✓" : " loading…"}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Sessions" value={loading ? "—" : stats.total_calls.toString()} icon={<IcoMic />} accent="indigo" loading={loading} />
        <StatsCard title="Active Now" value={loading ? "—" : stats.active_calls.toString()} icon={<IcoSignal />} accent="emerald" pulse={stats.active_calls > 0} loading={loading} />
        <StatsCard title="Completed" value={loading ? "—" : stats.completed_calls.toString()} icon={<IcoCheck />} accent="sky" loading={loading} />
        <StatsCard title="Offline Models" value="3" icon={<IcoCpu />} accent="violet" loading={false} />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Voice Call Panel */}
        <div className="surface-card rounded-2xl p-6 border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Live Conversation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click Start and speak naturally
              </p>
            </div>
          </div>
          <VoiceCall language="en" />
        </div>

        {/* Voice Cloner Panel */}
        <div className="surface-card rounded-2xl p-6 border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Voice Cloning</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload 6–30 s of audio to clone a voice locally
              </p>
            </div>
            <button
              onClick={() => setShowCloner((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-700 text-indigo-400 hover:bg-indigo-950 transition-colors"
            >
              {showCloner ? "Cancel" : "+ Clone Voice"}
            </button>
          </div>

          {showCloner ? (
            <VoiceUploader onSuccess={() => setShowCloner(false)} onCancel={() => setShowCloner(false)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-sm gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
              <p className="opacity-50 text-center">
                Click &quot;+ Clone Voice&quot; to create a<br />personalized AI voice from your audio
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );

}
