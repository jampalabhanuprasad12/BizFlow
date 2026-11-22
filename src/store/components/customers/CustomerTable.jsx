import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "../../lib/format.js";

const ICON_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PendingBalance({ amount }) {
  if (amount > 0) {
    return <span className="font-semibold text-red-600">{formatCurrency(amount)}</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
      Settled
    </span>
  );
}

function RowActions({ customer, onView, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onView?.(customer)}
        aria-label="View profile"
        title="View profile"
        className={`${ICON_BUTTON} text-slate-500 hover:bg-blue-50 hover:text-blue-600`}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onEdit?.(customer)}
        aria-label="Edit"
        title="Edit"
        className={`${ICON_BUTTON} text-slate-500 hover:bg-slate-100 hover:text-navy-900`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(customer)}
        aria-label="Delete"
        title="Delete"
        className={`${ICON_BUTTON} text-slate-500 hover:bg-red-50 hover:text-red-600`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function CustomerTable({ rows, onView, onEdit, onDelete }) {
  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Customer</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Phone</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Invoices</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total amount</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Amount paid</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Pending balance</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ customer, stats }) => (
              <tr key={customer.id} className="transition-smooth hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {initials(customer.name)}
                    </span>
                    <Link
                      to={`/customers/${customer.id}`}
                      className="font-medium text-navy-900 hover:text-blue-600 hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{customer.phone || "—"}</td>
                <td className="px-4 py-3 text-right text-navy-900">{stats.invoiceCount}</td>
                <td className="px-4 py-3 text-right text-navy-900">{formatCurrency(stats.totalAmount)}</td>
                <td className="px-4 py-3 text-right text-navy-900">{formatCurrency(stats.amountPaid)}</td>
                <td className="px-4 py-3 text-right">
                  <PendingBalance amount={stats.pendingBalance} />
                </td>
                <td className="px-4 py-3">
                  <RowActions customer={customer} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map(({ customer, stats }) => (
          <li key={customer.id} className="card-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="block truncate font-medium text-navy-900 hover:text-blue-600"
                  >
                    {customer.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{customer.phone || "—"}</p>
                </div>
              </div>
              <RowActions customer={customer} onView={onView} onEdit={onEdit} onDelete={onDelete} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Invoices</dt>
                <dd className="font-medium text-navy-900">{stats.invoiceCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Total amount</dt>
                <dd className="font-medium text-navy-900">{formatCurrency(stats.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Amount paid</dt>
                <dd className="font-medium text-navy-900">{formatCurrency(stats.amountPaid)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Pending balance</dt>
                <dd>
                  <PendingBalance amount={stats.pendingBalance} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
