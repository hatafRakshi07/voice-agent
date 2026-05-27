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
      className="stats-card relative rounded-2xl p-5 card-lift overflow-hidden"
      data-accent={accent}
    >
      {/* Top-right glow */}
      <div
        className="card-glow absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            {title}
          </p>
          {loading ? (
            <div className="skeleton h-9 w-20 rounded-lg" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white leading-none">
                {value}
              </span>
              {pulse && (
                <span
                  className={`w-2.5 h-2.5 rounded-full ${dots[accent]} animate-pulse`}
                />
              )}
            </div>
          )}
        </div>

        {/* Icon circle */}
        <div
          className="card-icon shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

