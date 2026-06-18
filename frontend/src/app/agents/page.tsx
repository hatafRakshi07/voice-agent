"use client";

import { useState } from "react";

/* ── Types ─────────────────────────────────────── */
type AgentStatus = "active" | "inactive" | "training";

interface Agent {
  id: string;
  name: string;
  description: string;
  language: string;
  personality: string;
  voiceName: string;
  status: AgentStatus;
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  greeting: string;
  promptTemplate: string;
  color: string;
}

/* ── Seed Indian Agents ─────────────────────────── */
const SEED_AGENTS: Agent[] = [
  {
    id: "a1",
    name: "Priya — Customer Support",
    description: "Primary customer support agent for handling billing, bookings & complaints",
    language: "Hindi / English",
    personality: "Professional & Empathetic",
    voiceName: "Priya (Female)",
    status: "active",
    totalCalls: 1842,
    successRate: 94,
    avgResponseTime: 820,
    greeting: "Namaste! Main Priya hoon. Aapki kya sahayata kar sakti hoon?",
    promptTemplate: "Aap ek professional customer support agent hain. Hindi aur English dono mein madad karein.",
    color: "#E40443",
  },
  {
    id: "a2",
    name: "Rohan — Sales Qualifier",
    description: "Qualifies inbound sales leads, schedules demos & product walkthroughs",
    language: "Hindi",
    personality: "Friendly & Persuasive",
    voiceName: "Rohan (Male)",
    status: "active",
    totalCalls: 728,
    successRate: 88,
    avgResponseTime: 950,
    greeting: "Namaskar! Main Rohan hoon. Aapko hamare products ke baare mein jaankari dene mein khushi hogi.",
    promptTemplate: "Aap ek friendly sales representative hain. Prospects ki zaroorat samjhein aur unhe qualify karein.",
    color: "#2563eb",
  },
  {
    id: "a3",
    name: "Kavya — Tech Support",
    description: "Technical support for enterprise clients — troubleshoot & resolve issues",
    language: "Tamil / English",
    personality: "Patient & Detailed",
    voiceName: "Kavya (Female)",
    status: "inactive",
    totalCalls: 413,
    successRate: 91,
    avgResponseTime: 1100,
    greeting: "Hello! I am Kavya from the technical support team. How can I help you today?",
    promptTemplate: "You are a patient technical support agent. Explain solutions clearly step by step.",
    color: "#d97706",
  },
  {
    id: "a4",
    name: "Arjun — Appointment Booking",
    description: "Handles appointment scheduling, reminders & rescheduling for clinics",
    language: "Hindi / English",
    personality: "Efficient & Polite",
    voiceName: "Arjun (Male)",
    status: "training",
    totalCalls: 0,
    successRate: 0,
    avgResponseTime: 0,
    greeting: "Namaste! Main Arjun hoon. Aapki appointment book karne mein madad karunga.",
    promptTemplate: "You are an appointment booking agent. Efficiently schedule, remind, and reschedule appointments.",
    color: "#7c3aed",
  },
];

const STATUS_CFG: Record<AgentStatus, { label: string; bg: string; text: string }> = {
  active:   { label: "Active",   bg: "bg-green-100", text: "text-green-700" },
  inactive: { label: "Inactive", bg: "bg-gray-100",  text: "text-gray-500" },
  training: { label: "Training", bg: "bg-amber-100", text: "text-amber-700" },
};

type FilterType = "all" | AgentStatus;

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-base font-bold text-gray-900">{value}</span>
      <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = agents.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || a.status === filter;
    return matchSearch && matchFilter;
  });

  const toggleStatus = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "active" ? "inactive" : "active" }
          : a
      )
    );
  };

  return (
    <div className="min-h-full bg-[#f5f5f5] px-6 py-8 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">AI Agents</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage Hindi &amp; English voice agents — create, configure, and deploy
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary-grad text-white text-sm px-5 py-2.5 rounded-xl font-semibold"
        >
          + New Agent
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Agents",    value: agents.length.toString() },
          { label: "Active",          value: agents.filter((a) => a.status === "active").length.toString() },
          { label: "Total Calls",     value: agents.reduce((s, a) => s + a.totalCalls, 0).toLocaleString("en-IN") },
          { label: "Avg Success",     value: `${Math.round(agents.filter(a => a.successRate > 0).reduce((s, a) => s + a.successRate, 0) / Math.max(agents.filter(a => a.successRate > 0).length, 1))}%` },
        ].map(({ label, value }) => (
          <div key={label} className="surface-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ─────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive", "training"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all ${
                filter === f
                  ? "bg-[#E40443] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-[#E40443]/30 hover:text-[#E40443]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent Grid ───────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="surface-card rounded-2xl p-16 text-center">
          <p className="text-gray-400 font-medium">No agents found</p>
          <p className="text-gray-300 text-xs mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filtered.map((agent) => {
            const sc = STATUS_CFG[agent.status];
            return (
              <div
                key={agent.id}
                className="agent-card p-5 cursor-pointer"
                onClick={() => setSelected(agent)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
                    style={{ background: `linear-gradient(135deg, ${agent.color} 0%, ${agent.color}aa 100%)` }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 leading-snug">{agent.name}</p>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{agent.description}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{agent.language}</span>
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{agent.voiceName}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <MetricBadge label="Calls" value={agent.totalCalls > 0 ? agent.totalCalls.toLocaleString("en-IN") : "—"} />
                  <MetricBadge label="Success" value={agent.successRate > 0 ? `${agent.successRate}%` : "—"} />
                  <MetricBadge label="Avg ms" value={agent.avgResponseTime > 0 ? `${agent.avgResponseTime}` : "—"} />
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStatus(agent.id); }}
                    className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                      agent.status === "active"
                        ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        : "bg-[#E40443]/10 text-[#E40443] hover:bg-[#E40443]/20"
                    }`}
                  >
                    {agent.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(agent); }}
                    className="text-xs text-[#E40443] hover:underline font-semibold"
                  >
                    View details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Agent Detail Modal ───────────────────── */}
      {selected && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div
            className="surface-deeper rounded-2xl max-w-lg w-full p-6 anim-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl"
                  style={{ background: `linear-gradient(135deg, ${selected.color} 0%, ${selected.color}aa 100%)` }}
                >
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">{selected.name}</h3>
                  <p className="text-sm text-gray-400">{selected.language} &bull; {selected.personality}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-close-sm w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selected.description}</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Greeting Message</p>
              <p className="text-sm text-gray-800 italic">&ldquo;{selected.greeting}&rdquo;</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Prompt</p>
              <p className="text-sm text-gray-700">{selected.promptTemplate}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <MetricBadge label="Total Calls" value={selected.totalCalls > 0 ? selected.totalCalls.toLocaleString("en-IN") : "—"} />
              <MetricBadge label="Success Rate" value={selected.successRate > 0 ? `${selected.successRate}%` : "—"} />
              <MetricBadge label="Avg Response" value={selected.avgResponseTime > 0 ? `${selected.avgResponseTime}ms` : "—"} />
            </div>
          </div>
        </div>
      )}

      {/* ── Create Agent Modal (placeholder) ─────── */}
      {showCreate && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="surface-deeper rounded-2xl max-w-md w-full p-6 anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Create New Agent</h3>
            <p className="text-sm text-gray-400 mb-5">Configure a new Hindi or English voice agent</p>
            <div className="space-y-3">
              {["Agent Name", "Language (Hindi/English)", "Personality", "Voice Profile"].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{field}</label>
                  <input
                    type="text"
                    placeholder={`Enter ${field.toLowerCase()}...`}
                    className="w-full input-dark rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">System Prompt</label>
                <textarea
                  rows={3}
                  placeholder="Aap ek helpful customer support agent hain..."
                  className="w-full input-dark rounded-xl px-3 py-2.5 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Cancel
              </button>
              <button className="btn-primary-grad text-white flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
