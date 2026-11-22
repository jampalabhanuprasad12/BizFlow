import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { EmptyState } from "../ui/index.js";
import { parseISODate } from "../../lib/dashboardMetrics.js";
import { formatCurrency, formatDate } from "../../lib/format.js";

export function RecentTransactions({ items = [] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No transactions yet"
        description="Payments and expenses you record will appear here."
        action={
          <Link
            to="/payments"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-smooth hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Add payment
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const isPayment = item.type === "payment";
        const Icon = isPayment ? ArrowDownLeft : ArrowUpRight;
        return (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isPayment ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-900">{item.title}</p>
              <p className="truncate text-xs text-slate-500">
                {item.subtitle} · {formatDate(parseISODate(item.date))}
              </p>
            </div>
            <p
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                isPayment ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPayment ? "+" : "−"}
              {formatCurrency(Math.abs(item.amount))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
