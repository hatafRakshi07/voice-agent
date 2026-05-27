"use client";

import { useEffect, useState } from "react";
import { getStats, getActiveCalls } from "@/lib/api";
import type { DashboardStats, Call } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import LiveCallCard from "@/components/LiveCallCard";

/* ── SVG icons for stat cards ─────────────────── */
function IcoPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
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
function IcoCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function IcoClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
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
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [s, ac] = await Promise.all([getStats(), getActiveCalls()]);
      setStats(s);
      setActiveCalls(ac);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-full bg-scene px-8 py-8 space-y-8 anim-fade-up">

      {/* ── Page header ──────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">
            Overview
          </p>
          <h1 className="text-3xl font-extrabold grad-text">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time AI Voice Call Agent monitor — auto-refreshes every 5 s
          </p>
        </div>

        {/* Live indicator */}
        <div
          className="badge-live flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Live
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Calls"
          value={loading ? "—" : stats.total_calls.toString()}
          icon={<IcoPhone />}
          accent="indigo"
          loading={loading}
        />
        <StatsCard
          title="Active Now"
          value={loading ? "—" : stats.active_calls.toString()}
          icon={<IcoSignal />}
          accent="emerald"
          pulse={stats.active_calls > 0}
          loading={loading}
        />
        <StatsCard
          title="Completed"
          value={loading ? "—" : stats.completed_calls.toString()}
          icon={<IcoCheck />}
          accent="sky"
          loading={loading}
        />
        <StatsCard
          title="Avg Duration"
          value={loading ? "—" : fmt(stats.avg_duration_seconds)}
          icon={<IcoClock />}
          accent="violet"
          loading={loading}
        />
      </div>

      {/* ── Live calls section ───────────────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">Live Calls</h2>
          {activeCalls.length > 0 && (
            <span
              className="badge-live-count inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeCalls.length} active
            </span>
          )}
        </div>

        {activeCalls.length === 0 ? (
          <div className="surface-empty rounded-2xl p-10 text-center">
            <div
              className="icon-slate-soft w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <p className="text-slate-400 font-medium text-sm">No active calls right now</p>
            <p className="text-slate-600 text-xs mt-1">Waiting for incoming calls…</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeCalls.map((call) => (
              <LiveCallCard key={call.call_sid} call={call} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
