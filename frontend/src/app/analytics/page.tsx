"use client";

import { useEffect, useState } from "react";
import { getAnalytics } from "@/lib/api";
import type { Analytics, DailyStats, CommonPhrase } from "@/lib/types";

// ── Tiny bar chart ──────────────────────────────────────────────────────────

function BarChart({ data }: { data: DailyStats[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-600">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
        </svg>
        <p className="text-sm opacity-50">No call data for this period</p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-1 h-44 w-full">
      {data.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
          <div className="relative w-full flex flex-col justify-end" style={{ height: "152px" }}>
            {/* Total bar */}
            <div
              className="w-full rounded-t-md transition-all duration-300"
              style={{
                height: `${(d.total / maxTotal) * 100}%`,
                background: "rgba(99,102,241,0.55)",
              }}
            />
            {/* Completed overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300"
              style={{
                height: `${(d.completed / maxTotal) * 100}%`,
                background: "rgba(52,211,153,0.45)",
              }}
            />
          </div>
          {/* Tooltip */}
          <div className="hidden group-hover:flex flex-col absolute -top-20 left-1/2 -translate-x-1/2 surface-deeper px-3 py-2 rounded-xl text-xs whitespace-nowrap z-20 shadow-2xl min-w-[100px]">
            <p className="font-semibold text-white mb-0.5">{d.day.slice(5)}</p>
            <p className="text-indigo-300">{d.total} total</p>
            <p className="text-emerald-300">{d.completed} done</p>
            {d.avg_duration > 0 && <p className="text-sky-300">avg {d.avg_duration}s</p>}
          </div>
          <span className="text-[9px] text-slate-700 truncate w-full text-center mt-0.5">
            {d.day.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getAnalytics(days);
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const totalCalls   = data?.daily.reduce((s, d) => s + d.total, 0) ?? 0;
  const totalDone    = data?.daily.reduce((s, d) => s + d.completed, 0) ?? 0;
  const avgDuration  = data?.daily.length
    ? Math.round(
        data.daily.reduce((s, d) => s + d.avg_duration, 0) / data.daily.filter(d => d.avg_duration > 0).length || 0
      )
    : 0;

  return (
    <div className="min-h-full bg-scene px-8 py-8 space-y-8 anim-fade-up">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">Insights</p>
          <h1 className="text-3xl font-extrabold grad-text">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Call volume, completion rates, and common questions</p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl surface-dark">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Calls",      value: totalCalls.toLocaleString(),       accent: "indigo" },
              { label: "Completed Calls",  value: totalDone.toLocaleString(),         accent: "emerald" },
              { label: "Avg Duration",     value: avgDuration > 0 ? `${avgDuration}s` : "—", accent: "sky" },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`stats-card rounded-2xl p-5 card-lift relative overflow-hidden`} data-accent={accent}>
                <div className="card-glow absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">{label}</p>
                <p className="text-3xl font-extrabold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Daily bar chart ── */}
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Daily Call Volume</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last {days} days of activity</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600/70 inline-block" />
                  Total
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50 inline-block" />
                  Completed
                </span>
              </div>
            </div>
            <BarChart data={data?.daily ?? []} />
          </div>

          {/* ── Common phrases ── */}
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-1">Most Common User Messages</h2>
            <p className="text-xs text-slate-500 mb-5">Top phrases from user turns</p>
            {data?.common_phrases.length ? (
              <div className="space-y-3">
                {data.common_phrases.map((p, i) => {
                  const maxFreq = data.common_phrases[0].frequency;
                  const pct = Math.round((p.frequency / maxFreq) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-700 w-4 text-right shrink-0 font-mono">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm text-slate-300 truncate">{p.content}</p>
                          <span className="text-xs text-slate-600 ml-2 shrink-0 font-mono">×{p.frequency}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(99,102,241,0.8), rgba(56,189,248,0.6))` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="surface-empty rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">No conversation data yet</p>
                <p className="text-slate-700 text-xs mt-1">Start some calls to see phrase analytics</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
