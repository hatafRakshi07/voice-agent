"use client";

import { useEffect, useState } from "react";
import { getStats, getModelStatus, getVoices } from "@/lib/api";
import type { DashboardStats, ModelStatus, VoiceProfile } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import VoiceCall from "@/components/VoiceCall";
import VoiceUploader from "@/components/VoiceUploader";
import Link from "next/link";

/* ── Icons ─────────────────────────────────────── */
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
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
      ready
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-amber-50 border-amber-200 text-amber-700"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ready ? "bg-green-500" : "bg-amber-400 animate-pulse"}`} />
      {label}
      <span className="opacity-60">{ready ? "ok" : "..."}</span>
    </div>
  );
}

/* ── Indian sample recent calls ─────────────────── */
const RECENT_CALLS = [
  { name: "Rahul Sharma",    phone: "+91 98201 34567", city: "Mumbai",    status: "completed",   duration: "3m 12s" },
  { name: "Priya Patel",     phone: "+91 93452 78901", city: "Ahmedabad", status: "completed",   duration: "1m 47s" },
  { name: "Amit Kumar",      phone: "+91 99101 23456", city: "Delhi",     status: "in_progress", duration: "0m 58s" },
  { name: "Neha Singh",      phone: "+91 87654 32109", city: "Bangalore", status: "no_answer",   duration: "—" },
  { name: "Vikram Gupta",    phone: "+91 96321 87654", city: "Hyderabad", status: "completed",   duration: "5m 04s" },
];

const STATUS_COLOR: Record<string, string> = {
  completed:   "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  no_answer:   "bg-gray-100 text-gray-500",
  failed:      "bg-red-100 text-red-600",
};

/* ── Indian AI Agents ───────────────────────────── */
const AGENTS = [
  { name: "Priya — Customer Support", lang: "Hindi / English", calls: 1842, rate: 94, status: "active",   color: "#E40443" },
  { name: "Rohan — Sales Qualifier",  lang: "Hindi",           calls: 728,  rate: 88, status: "active",   color: "#2563eb" },
  { name: "Kavya — Tech Support",     lang: "Tamil / English", calls: 413,  rate: 91, status: "inactive", color: "#d97706" },
];

/* ── Component ──────────────────────────────────── */
export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({ total_calls: 0, completed_calls: 0, active_calls: 0, avg_duration_seconds: 0 });
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, []);

  const modelsReady = modelStatus
    ? modelStatus.whisper.ready && modelStatus.xtts.ready && (modelStatus.llm?.ready ?? modelStatus.ollama.ready)
    : false;

  const avgDurSecs = stats.avg_duration_seconds;
  const avgDurStr = avgDurSecs > 0
    ? (Math.floor(avgDurSecs / 60) > 0 ? `${Math.floor(avgDurSecs / 60)}m ${Math.round(avgDurSecs % 60)}s` : `${Math.round(avgDurSecs)}s`)
    : "--";

  return (
    <div className="min-h-full bg-[#f5f5f5] px-6 py-8 space-y-6 anim-fade-up">

      {/* ── Hero (Dooper dark card style) ────────── */}
      <div className="relative overflow-hidden rounded-2xl surface-dark-card px-8 py-8">
        {/* Subtle red glow orb */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#E40443]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-[#E40443]/05 blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff6b9d] bg-[#E40443]/20 border border-[#E40443]/30 px-2.5 py-1 rounded-full mb-3">
              ⚡ Available 24/7
            </span>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              AI Voice Agent
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {modelStatus?.llm?.provider === "gemini" ? "Gemini" : "Ollama"} LLM &mdash; Whisper STT &mdash; Coqui XTTS-v2 &mdash; Hindi &amp; English
            </p>
          </div>
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all self-start mt-1 ${
            modelsReady
              ? "bg-green-900/30 border-green-700/40 text-green-300"
              : "bg-gray-800/60 border-gray-700/60 text-gray-400"
          }`}>
            <span className="relative flex h-2.5 w-2.5">
              {modelsReady && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${modelsReady ? "bg-green-400" : "bg-amber-400"}`} />
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
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Sessions"  value={loading ? "--" : stats.total_calls.toLocaleString("en-IN")} icon={<IcoMic />}    accent="indigo"  loading={loading} />
        <StatsCard title="Active Now"      value={loading ? "--" : stats.active_calls.toString()}             icon={<IcoSignal />} accent="emerald" pulse={stats.active_calls > 0} loading={loading} />
        <StatsCard title="Completed"       value={loading ? "--" : stats.completed_calls.toLocaleString("en-IN")} icon={<IcoCheck />} accent="sky" loading={loading} />
        <StatsCard title="Avg Duration"    value={loading ? "--" : avgDurStr}                                  icon={<IcoClock />}  accent="violet"  loading={loading} />
      </div>

      {/* ── AI Agents + Voice Call ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Active Agents */}
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-primary-soft w-8 h-8 rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
                  <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                  <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                  <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
                  <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">AI Agents</h2>
                <p className="text-xs text-gray-400 mt-0.5">Hindi &amp; English voice agents</p>
              </div>
            </div>
            <Link href="/agents" className="text-xs px-3 py-1.5 rounded-lg font-semibold btn-primary-grad transition-all">
              Manage →
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#E40443]/20 transition-all">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${agent.color} 0%, ${agent.color}99 100%)` }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{agent.name}</p>
                  <p className="text-xs text-gray-400">{agent.lang} &bull; {agent.calls.toLocaleString("en-IN")} calls</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    agent.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>{agent.status}</span>
                  <span className="text-xs text-gray-400">{agent.rate}% acc.</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Conversation */}
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
            <div className="icon-primary-soft w-8 h-8 rounded-lg flex items-center justify-center">
              <IcoMic />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Live Conversation</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click Start and speak naturally</p>
            </div>
          </div>
          <div className="p-6">
            {voices.length > 0 && (
              <div className="flex items-center gap-3 mb-5 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 shrink-0">Voice:</label>
                <select
                  value={selectedVoiceId || ""}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full bg-white text-sm text-gray-800 rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:border-[#E40443]/50"
                  title="Select voice profile" aria-label="Select voice profile"
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name} {v.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <VoiceCall voiceId={selectedVoiceId} language="hi" />
          </div>
        </div>
      </div>

      {/* ── Recent Calls ─────────────────────────── */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Calls</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest call activity</p>
          </div>
          <Link href="/calls" className="text-xs text-[#E40443] hover:underline font-semibold">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {RECENT_CALLS.map((call) => (
            <div key={call.phone} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#E40443]/10 border border-[#E40443]/20 flex items-center justify-center text-[#E40443] font-bold text-sm shrink-0">
                {call.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{call.name}</p>
                <p className="text-xs text-gray-400">{call.phone} &bull; {call.city}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[call.status] ?? STATUS_COLOR.no_answer}`}>
                {call.status.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-400 font-mono w-14 text-right">{call.duration}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Voice Cloning ────────────────────────── */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-primary-soft w-8 h-8 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Voice Cloning</h2>
              <p className="text-xs text-gray-400 mt-0.5">6–30 sec audio — fully offline</p>
            </div>
          </div>
          <button
            onClick={() => setShowCloner((v) => !v)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              showCloner ? "btn-ghost" : "btn-primary-grad text-white"
            }`}
          >
            {showCloner ? "Cancel" : "+ Clone"}
          </button>
        </div>
        <div className="p-6">
          {showCloner ? (
            <VoiceUploader onSuccess={() => { setShowCloner(false); fetchData(); }} onCancel={() => setShowCloner(false)} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl icon-primary-soft flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E40443" strokeWidth="1.4">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </div>
              <div>
                <p className="text-gray-700 font-semibold text-sm">No voice profile yet</p>
                <p className="text-gray-400 text-xs mt-1 max-w-[200px] mx-auto">Create an AI voice from a short Hindi or English audio sample</p>
              </div>
              <button onClick={() => setShowCloner(true)} className="btn-primary text-white px-5 py-2 rounded-xl text-xs font-semibold">
                Get started →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick nav ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/calls",     label: "Call Logs",    desc: "Full history & transcripts",     emoji: "📞" },
          { href: "/agents",    label: "AI Agents",    desc: "Manage Hindi/English agents",     emoji: "🤖" },
          { href: "/analytics", label: "Analytics",    desc: "Volume & phrase insights",        emoji: "📊" },
          { href: "/knowledge", label: "Knowledge",    desc: "Upload docs & FAQs",              emoji: "📚" },
        ].map(({ href, label, desc, emoji }) => (
          <Link
            key={href}
            href={href}
            className="surface-card rounded-xl p-4 hover:border-[#E40443]/30 hover:shadow-md transition-all card-lift flex flex-col gap-2"
          >
            <span className="text-2xl">{emoji}</span>
            <p className="text-sm font-bold text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </Link>
        ))}
      </div>

    </div>
  );
}
