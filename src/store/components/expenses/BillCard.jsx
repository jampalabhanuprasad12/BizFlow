import { CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/format.js";

const STATUS_STYLES = {
  paid: { label: "Paid", classes: "bg-green-50 text-green-700 ring-green-200" },
  overdue: { label: "Overdue", classes: "bg-red-50 text-red-700 ring-red-200" },
  due_soon: { label: "Due soon", classes: "bg-orange-50 text-orange-700 ring-orange-200" },
  upcoming: { label: "Upcoming", classes: "bg-blue-50 text-blue-700 ring-blue-200" },
};

function parseISODateUTC(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysUntilDue(dueDate) {
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseISODateUTC(dueDate) - todayUTC) / 86400000);
}

function daysText(bill, expense) {
  if (bill === "paid") return "Paid";
  const days = daysUntilDue(expense.dueDate);
  if (days === 0) return "Due today";
  if (days > 0) return `Due in ${days} ${days === 1 ? "day" : "days"}`;
  const overdue = Math.abs(days);
  return `Overdue by ${overdue} ${overdue === 1 ? "day" : "days"}`;
}

export function BillCard({ bill, expense, onMarkPaid }) {
  const status = STATUS_STYLES[bill] || STATUS_STYLES.upcoming;
  const isPaid = bill === "paid";

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{expense.name}</p>
          <p className="text-xs text-slate-500">{expense.category}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.classes}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-navy-900">{formatCurrency(expense.amount)}</p>
          <p className="text-xs text-slate-500">Due {formatDate(expense.dueDate)}</p>
          <p className="text-xs font-medium text-slate-600">{daysText(bill, expense)}</p>
        </div>

        {!isPaid && (
          <button
            type="button"
            aria-label="Mark paid"
            onClick={() => onMarkPaid(expense)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark paid
          </button>
        )}
      </div>
    </div>
  );
}

export default BillCard;
