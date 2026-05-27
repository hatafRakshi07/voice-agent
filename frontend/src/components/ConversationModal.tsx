"use client";

import { useEffect, useState } from "react";
import { getConversation } from "@/lib/api";
import type { Call, Conversation, ConversationTurn } from "@/lib/types";

function TurnBubble({ turn }: { turn: ConversationTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isUser ? "avatar-user" : "avatar-ai"}`}>
        {isUser ? "U" : "AI"}
      </div>

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? "bubble-user rounded-br-sm" : "bubble-ai rounded-bl-sm"}`}
      >
        <p>{turn.content}</p>
        <p
          className="text-[10px] mt-1.5 opacity-60"
        >
          {isUser
            ? `Confidence: ${((turn.confidence ?? 1) * 100).toFixed(0)}%`
            : `Latency: ${turn.latency_ms ?? 0} ms`}
        </p>
      </div>
    </div>
  );
}

interface Props {
  call: Call;
  onClose: () => void;
}

export default function ConversationModal({ call, onClose }: Props) {
  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversation(call.call_sid)
      .then(setConv)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [call.call_sid]);

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="surface-deeper w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl anim-scale-in"
      >
        {/* ── Header ───────────────────────────────── */}
        <div
          className="divide-dim-b flex items-center justify-between px-6 py-4 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div
              className="icon-indigo-soft w-9 h-9 rounded-xl flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Conversation Transcript</h2>
              <p className="text-xs text-slate-500 mt-0.5">{call.from_number} · {call.call_sid.slice(0, 20)}…</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-close-sm w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            title="Close conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Summary banner ───────────────────────── */}
        {conv?.summary && (
          <div
            className="summary-strip mx-5 mt-4 px-4 py-3 rounded-xl text-sm shrink-0"
          >
            <span className="font-semibold grad-text-blue mr-2 text-xs uppercase tracking-wider">Summary</span>
            <span className="text-slate-300">{conv.summary}</span>
          </div>
        )}

        {/* ── Transcript ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "flex-row-reverse" : ""} gap-2.5`}>
                  <div className="skeleton w-7 h-7 rounded-full shrink-0" />
                  <div className={`skeleton h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-64"}`} />
                </div>
              ))}
            </div>
          ) : conv?.turns.length === 0 ? (
            <p className="text-center text-slate-500 py-10">No transcript available.</p>
          ) : (
            conv?.turns.map((t) => <TurnBubble key={t._id} turn={t} />)
          )}
        </div>

        {/* ── Footer ───────────────────────────────── */}
        <div
          className="divide-dim-t px-6 py-3 flex items-center justify-between text-xs text-slate-600 shrink-0"
        >
          <span>{conv?.turns.length ?? 0} messages</span>
          <span>
            Duration:{" "}
            <span className="text-slate-400">
              {call.duration_seconds ? `${call.duration_seconds}s` : "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
