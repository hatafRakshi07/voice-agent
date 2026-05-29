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
      <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3 opacity-40"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <p className="opacity-50">Conversation will appear here…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      {turns.map((turn, idx) => (
        <div
          key={idx}
          className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              turn.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700"
            }`}
          >
            {turn.role === "assistant" && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Nova
                </span>
              </div>
            )}
            <p>{turn.text}</p>
            <p className="text-right text-[10px] opacity-40 mt-1">
              {new Date(turn.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
