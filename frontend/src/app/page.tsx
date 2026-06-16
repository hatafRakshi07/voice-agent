"use client";

import { useEffect, useState } from "react";
import { getStats, getModelStatus, getVoices } from "@/lib/api";
import type { DashboardStats, ModelStatus, VoiceProfile } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import VoiceCall from "@/components/VoiceCall";
import VoiceUploader from "@/components/VoiceUploader";

function IcoMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function IcoSignal() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="20" x2="1" y2="14" /><line x1="7" y1="20" x2="7" y2="10" />
      <line x1="13" y1="20" x2="13" y2="4" /><line x1="19" y1="20" x2="19" y2="2" />
    </svg>
  );
}
function IcoClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}


function ModelPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${ready
        ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-300"
        : "bg-amber-950/50 border-amber-800/60 text-amber-300"
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ready ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400 animate-pulse"
        }`} />
      {label}
      <span className="opacity-60">{ready ? "ok" : "..."}</span>
    </div>
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
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showCloner, setShowCloner] = useState(false);

  const fetchData = async () => {
    try {
      const [s, ms, vData] = await Promise.all([getStats(), getModelStatus(), getVoices()]);
      setStats(s);
      setModelStatus(ms);
      setVoices(vData.voices);

      if (vData.voices.length > 0) {
        setSelectedVoiceId((prev) => {
          if (prev) return prev;
          const def = vData.voices.find((v) => v.is_default);
          return def ? def.voice_id : vData.voices[0].voice_id;
        });
      }
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
    ? modelStatus.whisper.ready && modelStatus.xtts.ready &&
    (modelStatus.llm?.ready ?? modelStatus.ollama.ready)
    : false;

  const avgDurSecs = stats.avg_duration_seconds;
  const avgDurStr = avgDurSecs > 0
    ? (Math.floor(avgDurSecs / 60) > 0
      ? `${Math.floor(avgDurSecs / 60)}m ${Math.round(avgDurSecs % 60)}s`
      : `${Math.round(avgDurSecs)}s`)
    : "--";

  return (
    <div className="min-h-full bg-scene px-6 py-8 space-y-8 anim-fade-up">

      {/* -- Hero -- */}
      <div className="relative overflow-hidden rounded-2xl surface-card px-8 py-7">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-4 w-36 h-36 rounded-full bg-sky-500/06 blur-2xl pointer-events-none" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-full mb-3">
              Self-Hosted AI
            </span>
            <h1 className="text-4xl font-extrabold grad-text leading-tight">Voice Agent</h1>
            <p className="text-slate-500 text-sm mt-2">
              Whisper STT &mdash; {modelStatus?.llm?.provider === "gemini" ? "Gemini" : "Ollama"} LLM &mdash; Coqui XTTS-v2
            </p>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all self-start mt-1 ${modelsReady
              ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
              : "bg-slate-900/60 border-slate-700/60 text-slate-400"
            }`}>
            <span className="relative flex h-2.5 w-2.5">
              {modelsReady && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${modelsReady ? "bg-emerald-400" : "bg-amber-400"}`} />
            </span>
            {modelsReady ? "All systems ready" : "Initializing..."}
          </div>
        </div>
        {modelStatus && (
          <div className="relative flex flex-wrap gap-2 mt-5">
            <ModelPill label={`Whisper (${modelStatus.whisper.model})`} ready={modelStatus.whisper.ready} />
            <ModelPill
              label={modelStatus.llm?.provider === "gemini"
                ? `Gemini (${modelStatus.llm.model})`
                : `Ollama (${modelStatus.ollama.model})`}
              ready={modelStatus.llm?.ready ?? modelStatus.ollama.ready}
            />
            <ModelPill label="XTTS-v2 Voice" ready={modelStatus.xtts.ready} />
            {modelStatus.telephony_provider && <ModelPill label={`Telephony: ${modelStatus.telephony_provider}`} ready />}
            {modelStatus.vad && <ModelPill label={`VAD: ${modelStatus.vad}`} ready />}
          </div>
        )}
      </div>

      {/* -- Stats -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Sessions" value={loading ? "--" : stats.total_calls.toLocaleString()} icon={<IcoMic />} accent="indigo" loading={loading} />
        <StatsCard title="Active Now" value={loading ? "--" : stats.active_calls.toString()} icon={<IcoSignal />} accent="emerald" pulse={stats.active_calls > 0} loading={loading} />
        <StatsCard title="Completed" value={loading ? "--" : stats.completed_calls.toLocaleString()} icon={<IcoCheck />} accent="sky" loading={loading} />
        <StatsCard title="Avg Duration" value={loading ? "--" : avgDurStr} icon={<IcoClock />} accent="violet" loading={loading} />
      </div>

      {/* -- Two-column layout -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center gap-3">
            <div className="icon-indigo-soft w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400">
              <IcoMic />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Conversation</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click Start and speak naturally</p>
            </div>
          </div>
          <div className="p-6">
            {voices.length > 0 && (
              <div className="flex items-center gap-3 mb-5 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                  Call Voice:
                </label>
                <select
                  value={selectedVoiceId || ""}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full bg-slate-950/80 text-sm text-slate-200 rounded-lg border border-slate-800/80 px-3 py-1.5 focus:outline-none focus:border-indigo-500/50"
                  title="Select cloned voice profile"
                  aria-label="Select cloned voice profile"
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name} {v.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <VoiceCall voiceId={selectedVoiceId} language="en" />
          </div>
        </div>

        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-indigo-soft w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Voice Cloning</h2>
                <p className="text-xs text-slate-500 mt-0.5">6&ndash;30 s of audio &mdash; fully offline</p>
              </div>
            </div>
            <button
              onClick={() => setShowCloner((v) => !v)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${showCloner ? "btn-ghost" : "btn-primary-grad text-white"
                }`}
            >
              {showCloner ? "Cancel" : "+ Clone"}
            </button>
          </div>
          <div className="p-6">
            {showCloner ? (
              <VoiceUploader onSuccess={() => { setShowCloner(false); fetchData(); }} onCancel={() => setShowCloner(false)} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl icon-indigo-soft flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 font-semibold text-sm">No voice profile yet</p>
                  <p className="text-slate-600 text-xs mt-1 max-w-[200px] mx-auto">Create a personalized AI voice from a short audio sample</p>
                </div>
                <button onClick={() => setShowCloner(true)} className="btn-indigo-soft px-5 py-2 rounded-xl text-xs font-semibold">
                  Get started &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -- Quick nav -- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/calls", label: "Call Logs", desc: "Full history & transcripts" },
          { href: "/voices", label: "Voices", desc: "Clone & manage voice profiles" },
          { href: "/analytics", label: "Analytics", desc: "Volume & phrase insights" },
          { href: "/training", label: "Training", desc: "Fine-tune Whisper models" },
        ].map(({ href, label, desc }) => (
          <a key={href} href={href} className="surface-card rounded-xl p-4 flex items-center justify-between group card-lift">
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}