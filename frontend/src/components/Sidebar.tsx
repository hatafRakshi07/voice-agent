"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── SVG Icons ─────────────────────────────────── */
function IconGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconPhone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
function IconCpu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}
function IconMic({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function IconBrain({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 007 4.5v1A2.5 2.5 0 014.5 8H4a2 2 0 00-2 2v4a2 2 0 002 2h.5A2.5 2.5 0 017 18.5v1A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5v-1a2.5 2.5 0 012.5-2.5H20a2 2 0 002-2v-4a2 2 0 00-2-2h-.5A2.5 2.5 0 0117 5.5v-1A2.5 2.5 0 0114.5 2h-5z" />
    </svg>
  );
}
function IconChart({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconKey({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3" />
    </svg>
  );
}
function IconBook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconBell({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

/* ── Nav links ──────────────────────────────────── */
const links = [
  { href: "/",               label: "Dashboard",     Icon: IconGrid  },
  { href: "/calls",          label: "Call Logs",     Icon: IconPhone },
  { href: "/agents",         label: "AI Agents",     Icon: IconCpu   },
  { href: "/analytics",      label: "Analytics",     Icon: IconChart },
  { href: "/voices",         label: "Voices",        Icon: IconMic   },
  { href: "/knowledge",      label: "Knowledge",     Icon: IconBook  },
  { href: "/training",       label: "Training",      Icon: IconBrain },
  { href: "/notifications",  label: "Notifications", Icon: IconBell  },
  { href: "/api-keys",       label: "API Keys",      Icon: IconKey   },
];

/* ── Component ──────────────────────────────────── */
export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col glass border-r border-gray-200">

      {/* ── Logo ─────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="icon-brand w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-tight grad-text">
              VoiceAgent
            </p>
            <p className="text-[10px] text-gray-400 font-medium tracking-[0.12em] uppercase mt-0.5">
              AI Calling Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Section label ────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          Navigation
        </p>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "text-[#E40443] bg-red-50 border-l-2 border-[#E40443]"
                  : "text-gray-500 hover:text-[#E40443] hover:bg-red-50/60"
              }`}
            >
              <span className={`shrink-0 transition-colors duration-150 ${
                active ? "text-[#E40443]" : "text-gray-400 group-hover:text-[#E40443]"
              }`}>
                <Icon size={16} />
              </span>
              <span className="flex-1">{label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E40443] shadow-[0_0_6px_rgba(228,4,67,0.7)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────── */}
      <div className="mx-4 border-t border-gray-100" />

      {/* ── Status pill ──────────────────────────── */}
      <div className="px-4 py-4">
        <div className="icon-emerald-pill flex items-center gap-2.5 px-3 py-2.5 rounded-xl">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-green-600 font-medium">Agent online</span>
          <span className="ml-auto text-[10px] text-gray-400 font-mono">v1.0</span>
        </div>
      </div>
    </aside>
  );
}
