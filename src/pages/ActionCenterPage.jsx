import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store/index.js";
import { todayISO } from "../lib/invoices.js";
import { formatCurrency } from "../lib/format.js";
import { buildActions, sortActions } from "../lib/actionCenter.js";
import { PageHeader, Card, StatCard, EmptyState } from "../components/ui/index.js";
import { Zap, AlertTriangle, Clock } from "lucide-react";

const GROUPS = [
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High priority" },
  { key: "normal", label: "Normal" },
];

const PILL_CLASSES = {
  urgent: "bg-red-50 text-red-700 ring-red-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  normal: "bg-blue-50 text-blue-700 ring-blue-200",
};

export default function ActionCenterPage() {
  const { data } = useData();
  const today = todayISO();
  const actions = useMemo(() => sortActions(buildActions(data, today)), [data, today]);

  const counts = {
    urgent: actions.filter((a) => a.priority === "urgent").length,
    high: actions.filter((a) => a.priority === "high").length,
    normal: actions.filter((a) => a.priority === "normal").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Action Center"
        description="Prioritised tasks based on your invoices, bills and cash flow."
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <StatCard label="Urgent" value={counts.urgent} icon={AlertTriangle} />
        <StatCard label="High priority" value={counts.high} icon={Clock} />
        <StatCard label="Normal" value={counts.normal} icon={Zap} />
      </div>

      {actions.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Everything is under control"
          description="No urgent tasks right now."
        />
      ) : (
        GROUPS.map((group) => {
          const items = actions.filter((a) => a.priority === group.key);
          if (items.length === 0) return null;
          return (
            <section key={group.key} className="space-y-3">
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <div className="space-y-3">
                {items.map((action) => (
                  <Card
                    key={action.id ?? `${action.title}-${action.actionTo}`}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL_CLASSES[group.key]}`}
                      >
                        {group.label}
                      </span>
                      <p className="font-bold">{action.title}</p>
                      <p className="text-sm text-slate-500">{action.detail}</p>
                      {typeof action.amount === "number" && (
                        <p className="text-sm font-semibold">{formatCurrency(action.amount)}</p>
                      )}
                    </div>
                    <Link
                      to={action.actionTo}
                      className="inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      {action.actionLabel}
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
