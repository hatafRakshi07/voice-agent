"use client";

import { use } from "react";
import Link from "next/link";
import { SEED_CALLS, formatDuration } from "@/lib/data";
import type { CallLog, TranscriptMessage } from "@/lib/types";

function TranscriptBubble({ msg }: { msg: TranscriptMessage }) {
  const isAI = msg.speaker === "ai";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        isAI ? "bg-[#E40443]/10 text-[#E40443]" : "bg-gray-100 text-gray-600"
      }`}>
        {isAI ? "AI" : "C"}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isAI
          ? "bg-[#E40443] text-white rounded-tl-sm"
          : "bg-gray-100 text-gray-800 rounded-tr-sm"
      }`}>
        <p className="text-sm leading-relaxed">{msg.text}</p>
        <div className={`flex items-center gap-2 mt-1 ${isAI ? "justify-start" : "justify-end"}`}>
          {msg.latencyMs && (
            <span className={`text-[10px] ${isAI ? "text-white/60" : "text-gray-400"}`}>
              {msg.latencyMs}ms
            </span>
          )}
          {msg.confidence && (
            <span className={`text-[10px] ${isAI ? "text-white/60" : "text-gray-400"}`}>
              {(msg.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CallLog["status"] }) {
  const map = {
    answered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    missed: "bg-red-50 text-red-600 border-red-200",
    rejected: "bg-orange-50 text-orange-600 border-orange-200",
    active: "bg-blue-50 text-blue-600 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const call = SEED_CALLS.find(c => c.id === id);

  if (!call) {
    return (
      <div className="min-h-full bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Call not found</p>
          <Link href="/calls" className="text-[#E40443] text-sm mt-2 inline-block hover:underline">
            ← Back to Call Logs
          </Link>
        </div>
      </div>
    );
  }

  const callDate = new Date(call.startTime);
  const sentimentColor =
    call.sentiment === "positive" ? "#10b981" :
    call.sentiment === "negative" ? "#ef4444" : "#9ca3af";

  return (
    <div className="min-h-full bg-[#f5f5f5] px-8 py-8 anim-fade-up">
      {/* Back button */}
      <Link
        href="/calls"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#E40443] transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Call Logs
      </Link>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* ── Caller header ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#E40443]/10 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E40443"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{call.callerName}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{call.callerNumber}</p>
          </div>
          <StatusBadge status={call.status} />
        </div>

        {/* ── Meta grid ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {[
              { label: "Direction", value: call.direction.charAt(0).toUpperCase() + call.direction.slice(1) },
              { label: "Agent", value: call.agentName },
              { label: "Duration", value: formatDuration(call.durationSeconds) },
              { label: "Date & Time", value: `${callDate.toLocaleDateString("en-IN")} · ${callDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` },
            ].map((item, i) => (
              <div key={item.label} className={`px-6 py-4 ${i < 2 ? "border-b border-gray-100" : ""}`}>
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Sentiment + AI Accuracy */}
          {(call.sentiment || call.aiResponseAccuracy) && (
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
              {call.sentiment && (
                <div className="px-6 py-4">
                  <p className="text-xs text-gray-400 mb-1.5">Customer Sentiment</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sentimentColor }} />
                    <span className="text-sm font-semibold" style={{ color: sentimentColor }}>
                      {call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)}
                    </span>
                  </div>
                </div>
              )}
              {call.aiResponseAccuracy && (
                <div className="px-6 py-4">
                  <p className="text-xs text-gray-400 mb-1">AI Response Accuracy</p>
                  <p className="text-sm font-semibold text-emerald-600">{call.aiResponseAccuracy.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── AI Summary ────────────────────────── */}
        {call.summary && (
          <div className="bg-white rounded-2xl border border-[#E40443]/20 shadow-sm px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-[#E40443]/10 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E40443"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#E40443] uppercase tracking-wider">AI Summary</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* ── Transcript ────────────────────────── */}
        {call.transcript.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-gray-900">Conversation Transcript</p>
              <span className="text-xs text-gray-400">{call.transcript.length} messages</span>
            </div>
            <div className="space-y-4">
              {call.transcript.map(msg => (
                <TranscriptBubble key={msg.id} msg={msg} />
              ))}
            </div>
          </div>
        )}

        {/* Empty transcript notice */}
        {call.transcript.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p className="text-gray-400 text-sm">No transcript available for this call</p>
          </div>
        )}
      </div>
    </div>
  );
}
