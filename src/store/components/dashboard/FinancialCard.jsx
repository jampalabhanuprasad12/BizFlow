import { Link } from "react-router-dom";
import { formatCurrency } from "../../lib/format.js";

const TONES = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    glow: "bg-blue-500/10",
    link: "text-blue-600 hover:text-blue-700",
  },
  purple: {
    icon: "bg-purple-50 text-purple-600",
    glow: "bg-purple-500/10",
    link: "text-purple-600 hover:text-purple-700",
  },
  green: {
    icon: "bg-green-50 text-green-600",
    glow: "bg-green-500/10",
    link: "text-green-600 hover:text-green-700",
  },
  red: {
    icon: "bg-red-50 text-red-600",
    glow: "bg-red-500/10",
    link: "text-red-600 hover:text-red-700",
  },
  orange: {
    icon: "bg-orange-50 text-orange-600",
    glow: "bg-orange-500/10",
    link: "text-orange-600 hover:text-orange-700",
  },
  navy: {
    icon: "bg-slate-100 text-navy-900",
    glow: "bg-slate-500/10",
    link: "text-navy-900 hover:text-slate-600",
  },
};

export function FinancialCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "blue",
  to,
  actionLabel = "View",
}) {
  const palette = TONES[tone] ?? TONES.blue;

  return (
    <div className="card-surface relative flex h-full flex-col overflow-hidden p-5 transition-smooth hover:-translate-y-0.5 hover:shadow-md">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${palette.glow}`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-navy-900">
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {to && (
        <Link
          to={to}
          className={`relative mt-4 inline-flex w-fit items-center text-sm font-medium transition-smooth ${palette.link}`}
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
