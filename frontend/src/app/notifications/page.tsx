"use client";

import { useState } from "react";
import { SEED_NOTIFICATIONS } from "@/lib/data";
import type { NotificationItem } from "@/lib/types";

const NOTIF_ICONS: Record<string, string> = {
  incoming_call: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  missed_call: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  transcript: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  agent_status: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  error: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

const NOTIF_COLORS: Record<string, string> = {
  incoming_call: "#6366F1",
  missed_call: "#EF4444",
  transcript: "#10B981",
  agent_status: "#F59E0B",
  error: "#EF4444",
};

function NotifIcon({ type }: { type: string }) {
  const d = NOTIF_ICONS[type] ?? "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((path, i) => (
        <path key={i} d={i === 0 ? path : "M" + path} />
      ))}
    </svg>
  );
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);

  const unread = items.filter(n => !n.read).length;

  const markRead = (id: string) =>
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllRead = () =>
    setItems(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <div className="min-h-full bg-[#f5f5f5] px-8 py-8 anim-fade-up">
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Activity</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900">Notifications</h1>
            {unread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E40443] text-white">
                {unread}
              </span>
            )}
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-[#E40443] font-medium hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* ── List ────────────────────────────────── */}
      <div className="max-w-2xl space-y-2">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-8 py-14 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <p className="text-gray-400 text-sm">You're all caught up!</p>
          </div>
        ) : (
          items.map(item => {
            const iconColor = NOTIF_COLORS[item.type] ?? "#6366F1";
            return (
              <button
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all ${
                  item.read
                    ? "bg-white border-gray-100"
                    : "bg-[#E40443]/[0.03] border-[#E40443]/20"
                }`}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: iconColor + "18", color: iconColor }}
                >
                  <NotifIcon type={item.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${item.read ? "text-gray-700" : "text-gray-900"}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#E40443] shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${item.read ? "text-gray-400" : "text-gray-600"}`}>
                    {item.body}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
