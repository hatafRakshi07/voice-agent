"use client";

import { useMemo } from "react";
import { SEED_CALLS, computeAnalytics, formatDuration } from "@/lib/data";

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { date: string; totalCalls: number; answeredCalls: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.totalCalls), 1);
  const HEIGHT = 80;

  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: HEIGHT + 24 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
          <div className="relative w-full" style={{ height: HEIGHT }}>
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300"
              style={{ height: `${(d.totalCalls / maxVal) * 100}%`, backgroundColor: "rgba(228,4,67,0.25)" }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300"
              style={{ height: `${(d.answeredCalls / maxVal) * 100}%`, backgroundColor: "rgba(228,4,67,0.75)" }}
            />
            <div className="hidden group-hover:flex flex-col absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap z-20 shadow-xl">
              <p className="font-semibold mb-0.5">{d.date}</p>
              <p className="text-red-300">{d.totalCalls} total</p>
              <p className="text-emerald-300">{d.answeredCalls} answered</p>
            </div>
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.date}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const analytics = useMemo(() => computeAnalytics(SEED_CALLS), []);

  const sentimentData = [
    { label: "Positive", value: analytics.positiveSentiment, color: "#10b981" },
    { label: "Neutral",  value: analytics.neutralSentiment,  color: "#f59e0b" },
    { label: "Negative", value: analytics.negativeSentiment, color: "#ef4444" },
  ];

  return (
    <div className="min-h-full bg-[#f5f5f5] px-8 py-8 space-y-6 anim-fade-up">

      {/* ── Header ───────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Insights</p>
        <h1 className="text-3xl font-extrabold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Call performance, sentiment & AI accuracy</p>
      </div>

      {/* ── KPI cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Calls",    value: analytics.totalCalls,                           sub: "All time", color: "text-gray-900" },
          { label: "Minutes Talked", value: `${analytics.totalMinutesTalked}m`,              sub: "Conversation time", color: "text-[#E40443]" },
          { label: "AI Accuracy",    value: `${analytics.aiAccuracy.toFixed(1)}%`,           sub: "Response quality", color: "text-emerald-600" },
          { label: "Avg Response",   value: `${Math.round(analytics.avgResponseTimeMs)}ms`,  sub: "AI latency", color: "text-amber-600" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Calls per day chart ───────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Calls Per Day</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E40443]/25 inline-block" />Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E40443]/75 inline-block" />Answered
              </span>
            </div>
          </div>
          <BarChart data={analytics.daily} />
        </div>

        {/* ── Sentiment breakdown ───────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Customer Sentiment</h2>
          <div className="space-y-4">
            {sentimentData.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Call outcomes ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Call Outcomes</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Answered", value: analytics.answeredCalls, color: "#10b981" },
              { label: "Missed",   value: analytics.missedCalls,   color: "#ef4444" },
            ].map(o => (
              <div key={o.label} className="rounded-xl border px-4 py-4 text-center"
                style={{ borderColor: o.color + "40", backgroundColor: o.color + "08" }}>
                <p className="text-3xl font-extrabold" style={{ color: o.color }}>{o.value}</p>
                <p className="text-xs text-gray-500 mt-1">{o.label}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: o.color }}>
                  {analytics.totalCalls > 0 ? ((o.value / analytics.totalCalls) * 100).toFixed(0) : 0}%
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Average Call Duration</p>
            <p className="text-2xl font-extrabold text-[#E40443]">
              {formatDuration(Math.round(analytics.avgDurationSeconds))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Per answered call</p>
          </div>
        </div>

        {/* ── Top FAQs ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Top Customer Questions</h2>
          <div className="space-y-3">
            {analytics.topFAQs.map((faq, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E40443]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-[#E40443]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{faq.question}</p>
                </div>
                <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">{faq.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Agent performance ────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Agent Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Agent", "Total Calls", "Answered", "Missed", "Avg Duration", "Success Rate"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Priya", "Rohan", "Kavya"].map(agentName => {
                const calls = SEED_CALLS.filter(c => c.agentName === agentName);
                const answered = calls.filter(c => c.status === "answered");
                const missed = calls.filter(c => c.status === "missed");
                const totalDur = answered.reduce((s, c) => s + c.durationSeconds, 0);
                const avgDur = answered.length > 0 ? Math.round(totalDur / answered.length) : 0;
                const successRate = calls.length > 0
                  ? ((answered.length / calls.length) * 100).toFixed(0) : "—";
                return (
                  <tr key={agentName} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-6 font-semibold text-gray-800">{agentName}</td>
                    <td className="py-3 pr-6 text-gray-600">{calls.length}</td>
                    <td className="py-3 pr-6 text-emerald-600 font-medium">{answered.length}</td>
                    <td className="py-3 pr-6 text-red-500 font-medium">{missed.length}</td>
                    <td className="py-3 pr-6 text-gray-600">{formatDuration(avgDur)}</td>
                    <td className="py-3 pr-6">
                      <span className={`font-semibold ${Number(successRate) >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
                        {successRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

