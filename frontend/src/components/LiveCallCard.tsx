"use client";

import { useState, useEffect } from "react";
import type { Call } from "@/lib/types";

function useElapsed(start: string) {
  const [secs, setSecs] = useState(
    Math.floor((Date.now() - new Date(start).getTime()) / 1000)
  );
  useEffect(() => {
    const id = setInterval(
      () => setSecs(Math.floor((Date.now() - new Date(start).getTime()) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [start]);
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return m > 0 ? `${m}:${s}` : `0:${s}`;
}

export default function LiveCallCard({ call }: { call: Call }) {
  const elapsed = useElapsed(call.start_time);

  return (
    <div
      className="live-card relative rounded-2xl p-5 overflow-hidden card-lift"
    >
      {/* Subtle green glow top-right */}
      <div
        className="live-glow-orb absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none"
      />

      {/* Header row */}
      <div className="relative flex items-center justify-between mb-4">
        {/* LIVE badge */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 anim-live-ring">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
            Live
          </span>
        </div>

        {/* Timer */}
        <span
          className="timer-pill font-mono text-sm font-semibold tabular-nums px-2.5 py-1 rounded-lg"
        >
          {elapsed}
        </span>
      </div>

      {/* Caller info */}
      <div className="relative mb-4">
        <p className="text-white font-bold text-lg leading-tight">{call.phone_number}</p>
        <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          {call.direction === "outbound" ? "outbound" : "inbound"}
        </p>
      </div>

      {/* Sound wave + turns */}
      <div className="relative flex items-end justify-between">
        {/* Animated waveform */}
        <div className="flex items-end gap-[3px] h-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="wave-bar" />
          ))}
        </div>

        {/* Turn count */}
        <div className="text-right">
          <p className="text-white text-sm font-semibold">{call.turn_count}</p>
          <p className="text-slate-500 text-[10px]">turns</p>
        </div>
      </div>
    </div>
  );
}

