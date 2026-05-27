"use client";

import { useEffect, useState } from "react";
import { getCalls } from "@/lib/api";
import type { Call } from "@/lib/types";
import CallsTable from "@/components/CallsTable";

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = () => {
    setLoading(true);
    getCalls(page * PAGE_SIZE, PAGE_SIZE)
      .then(setCalls)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="min-h-full bg-scene px-8 py-8 space-y-6 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">History</p>
          <h1 className="text-3xl font-extrabold grad-text">Call Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Full history of all calls handled by the agent</p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={loading ? "animate-spin" : ""}
          >
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Table ────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <CallsTable calls={calls} />
      )}

      {/* ── Pagination ───────────────────────────── */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{calls.length} record{calls.length !== 1 ? "s" : ""}</span>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost-sm px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          >
            ← Prev
          </button>

          <span
            className="badge-page-num px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            {page + 1}
          </span>

          <button
            disabled={calls.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost-sm px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

