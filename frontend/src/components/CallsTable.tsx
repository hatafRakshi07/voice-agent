"use client";

import { useState } from "react";
import type { Call } from "@/lib/types";
import ConversationModal from "./ConversationModal";

const STATUS_CFG: Record<string, { label: string }> = {
  completed:   { label: "Completed"   },
  in_progress: { label: "In Progress" },
  ringing:     { label: "Ringing"     },
  failed:      { label: "Failed"      },
  no_answer:   { label: "No Answer"   },
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_CFG[status]?.label ?? STATUS_CFG.no_answer.label;
  return (
    <span
      className="status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      data-status={status in STATUS_CFG ? status : "no_answer"}
    >
      <span
        className="status-dot w-1.5 h-1.5 rounded-full"
        data-status={status in STATUS_CFG ? status : "no_answer"}
      />
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDuration(secs?: number) {
  if (!secs) return <span className="text-slate-600">—</span>;
  const m = Math.floor(secs / 60), s = secs % 60;
  return <span>{m > 0 ? `${m}m ${s}s` : `${s}s`}</span>;
}

export default function CallsTable({ calls }: { calls: Call[] }) {
  const [selected, setSelected] = useState<Call | null>(null);

  if (calls.length === 0) {
    return (
      <div className="surface-empty rounded-2xl p-12 text-center">
        <p className="text-slate-400 font-medium">No calls recorded yet</p>
        <p className="text-slate-600 text-xs mt-1">Calls will appear here once your agent receives them</p>
      </div>
    );
  }

  return (
    <>
      <div className="surface-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="divide-dim-b">
              {["From", "To", "Status", "Started", "Duration", "Turns", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-widest text-slate-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((call, idx) => (
              <tr
                key={call.call_sid}
                className={`row-hover transition-colors duration-100 ${idx < calls.length - 1 ? "divide-dim-b2" : ""}`}
              >
                <td className="px-5 py-3.5 font-semibold text-white">{call.from_number}</td>
                <td className="px-5 py-3.5 text-slate-500">{call.to_number}</td>
                <td className="px-5 py-3.5"><StatusBadge status={call.status} /></td>
                <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(call.start_time)}</td>
                <td className="px-5 py-3.5 text-slate-400">{fmtDuration(call.duration_seconds)}</td>
                <td className="px-5 py-3.5 text-slate-400">{call.turn_count}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => setSelected(call)}
                    className="btn-indigo-view inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  >
                    View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ConversationModal call={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
