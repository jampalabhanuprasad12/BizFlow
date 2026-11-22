import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card } from "../ui/index.js";

const SEVERITY = {
  danger: {
    Icon: AlertOctagon,
    bar: "bg-red-500",
    icon: "bg-red-50 text-red-600",
    badge: "bg-red-50 text-red-700 ring-red-200",
  },
  warning: {
    Icon: AlertTriangle,
    bar: "bg-orange-500",
    icon: "bg-orange-50 text-orange-600",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  info: {
    Icon: Info,
    bar: "bg-blue-500",
    icon: "bg-blue-50 text-blue-600",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
  },
};

export function SmartAlerts({ alerts = [] }) {
  return (
    <Card title="Smart alerts" description="Items that need your attention">
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-green-100 bg-green-50/60 px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-navy-900">All clear</h3>
          <p className="mt-1 text-sm text-slate-500">No urgent items right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((alert) => {
            const style = SEVERITY[alert.severity] ?? SEVERITY.info;
            const { Icon } = style;
            return (
              <li
                key={alert.id}
                className="relative flex flex-wrap items-center gap-3 py-4 pl-5 pr-1 sm:flex-nowrap sm:gap-4"
              >
                <span
                  aria-hidden="true"
                  className={`absolute bottom-3 left-0 top-3 w-1 rounded-full ${style.bar}`}
                />
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy-900">{alert.title}</p>
                    <span
                      className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
                    >
                      {alert.count}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{alert.message}</p>
                </div>
                {alert.actionTo && (
                  <Link
                    to={alert.actionTo}
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-navy-900 transition-smooth hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {alert.actionLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
