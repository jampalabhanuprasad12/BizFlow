import { CheckCircle2, Circle, Printer, History, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/format.js";
import { DataTable } from "../ui/index.js";

const STATUS_META = {
  paid: { label: "Paid", classes: "bg-green-50 text-green-700 ring-green-200" },
  overdue: { label: "Overdue", classes: "bg-red-50 text-red-700 ring-red-200" },
  due_soon: { label: "Due soon", classes: "bg-orange-50 text-orange-700 ring-orange-200" },
  upcoming: { label: "Upcoming", classes: "bg-blue-50 text-blue-700 ring-blue-200" },
};

const ACTION_BUTTON =
  "rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900";

function StatusPill({ bill }) {
  const meta = STATUS_META[bill] || STATUS_META.upcoming;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

function RecurringBadge({ expense }) {
  const frequency = expense.recurring?.frequency;
  if (!frequency || frequency === "none") return null;
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      Repeats {frequency}
    </span>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="inline-flex rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-700 ring-1 ring-inset ring-navy-100">
      {category}
    </span>
  );
}

export function ExpenseTable({
  rows,
  onEdit,
  onDelete,
  onToggleStatus,
  onPrint,
  onViewHistory,
}) {
  const list = rows || [];

  const renderActions = (row) => {
    const { expense, bill } = row;
    const isPaid = bill === "paid";
    const ToggleIcon = isPaid ? CheckCircle2 : Circle;
    const toggleLabel = isPaid ? "Mark unpaid" : "Mark paid";
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          className={ACTION_BUTTON}
          onClick={() => onToggleStatus?.(expense, isPaid ? "unpaid" : "paid")}
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
        {isPaid && (
          <button
            type="button"
            aria-label="Print receipt"
            title="Print receipt"
            className={ACTION_BUTTON}
            onClick={() => onPrint?.(expense)}
          >
            <Printer className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="View history"
          title="View history"
          className={ACTION_BUTTON}
          onClick={() => onViewHistory?.(expense)}
        >
          <History className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Edit"
          title="Edit"
          className={ACTION_BUTTON}
          onClick={() => onEdit?.(expense)}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          title="Delete"
          className={ACTION_BUTTON}
          onClick={() => onDelete?.(expense)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const columns = [
    {
      key: "expense",
      header: "Expense",
      render: ({ expense }) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-900">{expense.name}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryPill category={expense.category} />
            <RecurringBadge expense={expense} />
          </div>
        </div>
      ),
    },
    {
      key: "expenseDate",
      header: "Expense date",
      render: ({ expense }) => formatDate(expense.expenseDate),
    },
    {
      key: "dueDate",
      header: "Due date",
      render: ({ expense }) => formatDate(expense.dueDate),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: ({ expense }) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(expense.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: ({ bill }) => <StatusPill bill={bill} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => renderActions(row),
    },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(r) => r.expense.id}
          emptyText="No expenses to show"
        />
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            No expenses to show
          </p>
        )}
        {list.map((row) => {
          const { expense, bill } = row;
          return (
            <div
              key={expense.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{expense.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CategoryPill category={expense.category} />
                    <RecurringBadge expense={expense} />
                  </div>
                </div>
                <StatusPill bill={bill} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Expense date</dt>
                  <dd className="text-slate-800">{formatDate(expense.expenseDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Due date</dt>
                  <dd className="text-slate-800">{formatDate(expense.dueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Amount</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatCurrency(expense.amount)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-slate-100 pt-2">
                {renderActions(row)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ExpenseTable;
