"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── SVG Icons ─────────────────────────────────── */
function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPhone({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function IconMic({ size = 18 }: { size?: number }) {
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

function IconCpu({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

/* ── Nav links ──────────────────────────────────── */
const links = [
  { href: "/",       label: "Dashboard", Icon: IconGrid  },
  { href: "/calls",  label: "Call Logs", Icon: IconPhone },
  { href: "/voices", label: "Voices",    Icon: IconMic   },
];

/* ── Component ──────────────────────────────────── */
export default function Sidebar() {
  const path = usePathname();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col glass border-r border-white/[0.06]"
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Icon mark */}
          <div
            className="icon-brand w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          >
            <IconCpu size={18} />
          </div>
          {/* Text */}
          <div>
            <p className="text-sm font-700 text-white leading-tight font-bold grad-text">
              VoiceAgent
            </p>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
              AI Call Center
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "nav-active text-white"
                  : "nav-inactive text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`shrink-0 transition-colors duration-150 ${
                  active
                    ? "text-indigo-400"
                    : "text-slate-600 group-hover:text-slate-400"
                }`}
              >
                <Icon size={16} />
              </span>
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Status pill ──────────────────────────── */}
      <div className="px-4 pb-4 pt-2 border-t border-white/5">
        <div
          className="icon-emerald-pill flex items-center gap-2.5 px-3 py-2 rounded-lg"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">Agent online</span>
          <span className="ml-auto text-[10px] text-slate-600">v1.0</span>
        </div>
      </div>
    </aside>
  );
}

