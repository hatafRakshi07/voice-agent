"use client";

import { useEffect, useRef } from "react";

export interface ConversationTurnLocal {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface Props {
  turns: ConversationTurnLocal[];
}

export default function ConversationHistory({ turns }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-slate-600">
        <div className="w-12 h-12 rounded-2xl icon-indigo-soft flex items-center justify-center mb-3 opacity-60">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(129,140,248,0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 font-medium">No conversation yet</p>
        <p className="text-xs text-slate-700 mt-1">Start speaking to begin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      {turns.map((turn, idx) => (
        <div
          key={idx}
          className={`flex gap-2.5 anim-fade-up ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          style={{ animationDelay: `${idx * 0.05}s` }}
        >
          {/* AI avatar */}
          {turn.role === "assistant" && (
            <div className="w-7 h-7 rounded-full avatar-ai flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
          )}

          <div
            className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              turn.role === "user"
                ? "chat-bubble-user rounded-br-sm"
                : "chat-bubble-ai rounded-bl-sm"
            }`}
          >
            {turn.role === "assistant" && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Nova</span>
              </div>
            )}
            <p className="text-[13px]">{turn.text}</p>
            <p className={`text-[10px] mt-1 ${turn.role === "user" ? "text-right text-indigo-200/60" : "text-slate-600"}`}>
              {new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* User avatar */}
          {turn.role === "user" && (
            <div className="w-7 h-7 rounded-full avatar-user flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
              U
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
