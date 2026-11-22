const ACCENTS = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  orange: "bg-orange-50 text-orange-600",
};

const TREND_TEXT = {
  up: "text-green-600",
  down: "text-red-600",
  neutral: "text-slate-500",
};

export function StatCard({
  title,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  accent = "blue",
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-navy-900">{value}</p>
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACCENTS[accent] ?? ACCENTS.blue}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {delta && (
        <p className={`mt-3 text-sm font-medium ${TREND_TEXT[trend] ?? TREND_TEXT.neutral}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
