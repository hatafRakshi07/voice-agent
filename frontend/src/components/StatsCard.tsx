interface Props {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: "indigo" | "sky" | "emerald" | "violet";
  pulse?: boolean;
  loading?: boolean;
}

const dots: Record<string, string> = {
  indigo:  "bg-indigo-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  violet:  "bg-violet-400",
};

export default function StatsCard({ title, value, icon, accent, pulse, loading }: Props) {
  return (
    <div
      className="stats-card relative rounded-2xl p-5 card-lift overflow-hidden group"
      data-accent={accent}
    >
      {/* Top-right glow orb */}
      <div className="card-glow absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-500 group-hover:scale-125" />

      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">
            {title}
          </p>
          {loading ? (
            <div className="skeleton h-9 w-24 rounded-lg" />
          ) : (
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-white leading-none tabular-nums">
                {value}
              </span>
              {pulse && (
                <span className={`mb-0.5 w-2.5 h-2.5 rounded-full ${dots[accent]} shadow-[0_0_8px_currentColor] animate-pulse`} />
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className="card-icon shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </div>
  );
}

