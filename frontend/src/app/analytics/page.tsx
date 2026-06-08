"use client";

import { useEffect, useState } from "react";
import { getAnalytics } from "@/lib/api";
import type { Analytics, DailyStats, CommonPhrase } from "@/lib/types";

// ── Tiny bar chart ──────────────────────────────────────────────────────────

function BarChart({ data }: { data: DailyStats[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        No call data yet
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-1.5 h-40 w-full">
      {data.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1 flex-1 min-w-0 group">
          <div className="relative w-full flex flex-col justify-end" style={{ height: "128px" }}>
            {/* total bar */}
            <div
              className="w-full rounded-t-sm bg-indigo-600/60 group-hover:bg-indigo-500/80 transition-all duration-150"
              style={{ height: `${(d.total / maxTotal) * 100}%` }}
            />
            {/* completed overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-emerald-500/40"
              style={{ height: `${(d.completed / maxTotal) * 100}%` }}
            />
          </div>
          {/* tooltip on hover */}
          <div className="hidden group-hover:block absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white whitespace-nowrap z-10 pointer-events-none">
            <p className="font-semibold">{d.day}</p>
            <p>{d.total} calls ({d.completed} done)</p>
            {d.avg_duration > 0 && <p>avg {d.avg_duration}s</p>}
          </div>
          <span className="text-[9px] text-slate-600 truncate w-full text-center">
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
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
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
              { label: "Total Calls",       value: totalCalls,              color: "text-indigo-400" },
              { label: "Completed Calls",   value: totalDone,               color: "text-emerald-400" },
              { label: "Avg Duration (s)",  value: avgDuration > 0 ? `${avgDuration}s` : "—", color: "text-sky-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="surface rounded-2xl p-5 border border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">{label}</p>
                <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Daily bar chart ── */}
          <div className="surface rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Daily Call Volume</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600/60 inline-block" />
                  Total
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 inline-block" />
                  Completed
                </span>
              </div>
            </div>
            <div className="relative">
              <BarChart data={data?.daily ?? []} />
            </div>
          </div>

          {/* ── Common phrases ── */}
          <div className="surface rounded-2xl p-6 border border-white/5">
            <h2 className="text-sm font-bold text-white mb-4">Most Common User Messages</h2>
            {data?.common_phrases.length ? (
              <div className="space-y-2">
                {data.common_phrases.map((p, i) => {
                  const maxFreq = data.common_phrases[0].frequency;
                  const pct = Math.round((p.frequency / maxFreq) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-4 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm text-slate-300 truncate">{p.content}</p>
                          <span className="text-xs text-slate-600 ml-2 shrink-0">×{p.frequency}</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500/60 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No conversation data yet — start some calls!</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
