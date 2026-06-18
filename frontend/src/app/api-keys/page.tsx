"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string;
  created: string;
  scopes: string[];
  status: "active" | "revoked";
}

const SEED_KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Production — Mumbai Server",
    prefix: "va_live_9xK2m",
    lastUsed: "2 minutes ago",
    created: "12 Jan 2026",
    scopes: ["calls:read", "calls:write", "agents:read"],
    status: "active",
  },
  {
    id: "k2",
    name: "Staging — Hyderabad Dev",
    prefix: "va_test_7rBn4",
    lastUsed: "1 hour ago",
    created: "5 Mar 2026",
    scopes: ["calls:read", "agents:read", "agents:write"],
    status: "active",
  },
  {
    id: "k3",
    name: "Analytics Dashboard",
    prefix: "va_live_2wQe8",
    lastUsed: "3 days ago",
    created: "28 Feb 2026",
    scopes: ["analytics:read"],
    status: "active",
  },
  {
    id: "k4",
    name: "Old Integration (Revoked)",
    prefix: "va_live_5mPk1",
    lastUsed: "45 days ago",
    created: "1 Nov 2025",
    scopes: ["calls:read"],
    status: "revoked",
  },
];

const SCOPE_COLOR: Record<string, string> = {
  "calls:read":      "bg-blue-50 text-blue-700 border-blue-100",
  "calls:write":     "bg-purple-50 text-purple-700 border-purple-100",
  "agents:read":     "bg-green-50 text-green-700 border-green-100",
  "agents:write":    "bg-amber-50 text-amber-700 border-amber-100",
  "analytics:read":  "bg-gray-50 text-gray-600 border-gray-200",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(SEED_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, status: "revoked" as const } : k));
  };

  const copyPrefix = (id: string, prefix: string) => {
    navigator.clipboard.writeText(`${prefix}...`).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeCount = keys.filter((k) => k.status === "active").length;

  return (
    <div className="min-h-full bg-[#f5f5f5] px-6 py-8 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage API keys for integrating VoiceAgent with your applications
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary-grad text-white text-sm px-5 py-2.5 rounded-xl font-semibold"
        >
          + Generate Key
        </button>
      </div>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Keys",  value: keys.length.toString() },
          { label: "Active",      value: activeCount.toString() },
          { label: "Revoked",     value: (keys.length - activeCount).toString() },
        ].map(({ label, value }) => (
          <div key={label} className="surface-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Security notice ──────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
        <span className="text-amber-500 text-lg shrink-0">⚠️</span>
        <p className="text-xs text-amber-700">
          API keys provide full programmatic access to your VoiceAgent. Never share keys publicly or commit them to source control. Rotate keys every 90 days as per best practices.
        </p>
      </div>

      {/* ── Keys List ────────────────────────────── */}
      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className={`surface-card rounded-2xl p-5 ${key.status === "revoked" ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-4 flex-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  key.status === "active" ? "icon-primary-soft" : "icon-slate-soft bg-gray-100"
                }`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={key.status === "active" ? "#E40443" : "#9ca3af"} strokeWidth="1.8">
                    <circle cx="7.5" cy="15.5" r="4.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{key.name}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      key.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {key.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-mono">
                      {key.prefix}••••••••••••
                    </code>
                    {key.status === "active" && (
                      <button
                        onClick={() => copyPrefix(key.id, key.prefix)}
                        className="text-xs text-[#E40443] hover:underline font-medium"
                      >
                        {copiedId === key.id ? "Copied!" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Created {key.created}</span>
                    <span className="text-gray-200">•</span>
                    <span>Last used {key.lastUsed}</span>
                  </div>
                </div>
              </div>
              {key.status === "active" && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="btn-danger-soft text-xs px-3.5 py-1.5 rounded-lg font-semibold"
                >
                  Revoke
                </button>
              )}
            </div>

            {key.scopes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {key.scopes.map((scope) => (
                  <span
                    key={scope}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium border ${SCOPE_COLOR[scope] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}
                  >
                    {scope}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Documentation card ───────────────────── */}
      <div className="surface-dark-card rounded-2xl p-6 mt-6">
        <h3 className="text-white font-bold text-base mb-2">📖 Integration Guide</h3>
        <p className="text-gray-400 text-sm mb-4">
          Use the API to trigger outbound calls, manage agents, and retrieve analytics from your existing CRM or ERP system.
        </p>
        <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-green-300 overflow-x-auto">
          <p className="text-gray-500"># Trigger outbound call (cURL)</p>
          <p className="mt-1">curl -X POST https://api.voiceagent.in/v1/calls \</p>
          <p className="ml-4">-H &quot;Authorization: Bearer va_live_9xK2m...&quot; \</p>
          <p className="ml-4">-d &apos;&#123;&quot;to&quot;: &quot;+91 98201 34567&quot;, &quot;agent_id&quot;: &quot;a1&quot;, &quot;language&quot;: &quot;hi&quot;&#125;&apos;</p>
        </div>
        <p className="text-xs text-gray-500 mt-3">Base URL: <span className="text-[#ff6b9d]">https://api.voiceagent.in</span> &bull; Supports REST &bull; Webhooks available</p>
      </div>

      {/* ── Create Key Modal ─────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="surface-deeper rounded-2xl max-w-md w-full p-6 anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Generate API Key</h3>
            <p className="text-sm text-gray-400 mb-5">Create a new API key for your integration</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production — Bangalore Server"
                  className="w-full input-dark rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {["calls:read", "calls:write", "agents:read", "agents:write", "analytics:read"].map((scope) => (
                    <label key={scope} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" className="accent-[#E40443]" defaultChecked={scope.includes("read")} />
                      <span className="text-xs font-mono text-gray-600">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-primary-grad text-white flex-1 py-2.5 rounded-xl text-sm font-semibold"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
