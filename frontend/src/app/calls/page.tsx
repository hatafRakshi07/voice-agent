"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  SEED_CALLS, filterCallsByTime, formatDuration, computeAnalytics
} from "@/lib/data";
import type { CallLog } from "@/lib/types";

type TimeFilter = "today" | "week" | "month";

function PhoneInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 2 16 8 22 8" /><line x1="23" y1="1" x2="16" y2="8" />
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
function PhoneOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 7 23 1 17 1" /><line x1="16" y1="8" x2="23" y2="1" />
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: CallLog["status"] }) {
  const map = {
    answered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    missed:   "bg-red-50 text-red-600 border-red-200",
    rejected: "bg-orange-50 text-orange-600 border-orange-200",
    active:   "bg-blue-50 text-blue-600 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return null;
  const color = sentiment === "positive" ? "bg-emerald-500" : sentiment === "negative" ? "bg-red-500" : "bg-gray-400";
  return <span title={sentiment} className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function CallsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const byTime = filterCallsByTime(SEED_CALLS, timeFilter);
    if (!search.trim()) return byTime;
    const q = search.toLowerCase();
    return byTime.filter(c =>
      c.callerName.toLowerCase().includes(q) ||
      c.callerNumber.includes(q) ||
      c.agentName.toLowerCase().includes(q)
    );
  }, [timeFilter, search]);

  const analytics = useMemo(() => computeAnalytics(filtered), [filtered]);
  const allAnalytics = useMemo(() => computeAnalytics(SEED_CALLS), []);

  return (
    <div className="min-h-full bg-[#f5f5f5] px-8 py-8 space-y-6 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">History</p>
          <h1 className="text-3xl font-extrabold text-gray-900">Call Logs</h1>
          <p className="text-gray-500 text-sm mt-1">All calls handled by your AI agents</p>
        </div>
        <Link
          href="/calls/active"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#140609] text-white text-sm font-semibold hover:bg-[#E40443] transition-colors shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          Live Monitor
        </Link>
      </div>

      {/* ── Mini stats ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Calls", value: analytics.totalCalls, color: "text-gray-900" },
          { label: "Answered", value: analytics.answeredCalls, color: "text-emerald-600" },
          { label: "Missed", value: analytics.missedCalls, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ─────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {(["today", "week", "month"] as TimeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeFilter === t
                  ? "bg-[#E40443] text-white shadow-sm"
                  : "text-gray-500 hover:text-[#E40443]"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            placeholder="Search caller, number, agent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} call{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Call list ────────────────────────────── */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-8 py-12 text-center">
            <p className="text-gray-400 text-sm">No calls found for this filter</p>
          </div>
        ) : (
          filtered.map(call => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              className="block bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-[#E40443]/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Direction icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  call.direction === "incoming"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-purple-50 text-purple-600"
                }`}>
                  {call.direction === "incoming" ? <PhoneInIcon /> : <PhoneOutIcon />}
                </div>

                {/* Caller info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#E40443] transition-colors truncate">
                      {call.callerName}
                    </p>
                    <SentimentDot sentiment={call.sentiment} />
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{call.callerNumber}</p>
                </div>

                {/* Agent */}
                <div className="hidden sm:block text-center">
                  <p className="text-xs text-gray-400">Agent</p>
                  <p className="text-xs font-semibold text-gray-700">{call.agentName}</p>
                </div>

                {/* Duration */}
                <div className="text-center w-16">
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="text-xs font-semibold text-gray-700">{formatDuration(call.durationSeconds)}</p>
                </div>

                {/* Date */}
                <div className="hidden md:block text-center w-24">
                  <p className="text-xs text-gray-400">Time</p>
                  <p className="text-xs font-semibold text-gray-700">
                    {new Date(call.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(call.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {/* Status */}
                <StatusBadge status={call.status} />

                {/* Arrow */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="group-hover:stroke-[#E40443] transition-colors shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {call.summary && (
                <p className="text-xs text-gray-400 mt-2 ml-13 pl-13 truncate border-t border-gray-50 pt-2">
                  <span className="text-[#E40443] font-semibold mr-1">AI:</span>{call.summary}
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
