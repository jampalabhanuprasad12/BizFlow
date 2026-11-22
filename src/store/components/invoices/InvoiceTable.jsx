import { Link } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2, Wallet } from "lucide-react";
import { DataTable } from "../ui/index.js";
import { InvoiceStatusBadge } from "./StatusPill.jsx";
import { formatCurrency, formatDate } from "../../lib/format.js";

const ACTION_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const ACTION_TONE = "text-slate-500 hover:bg-slate-100 hover:text-navy-900";
const DANGER_TONE = "text-slate-500 hover:bg-red-50 hover:text-red-600";

function IconButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`${ACTION_BASE} ${danger ? DANGER_TONE : ACTION_TONE}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function RowActions({ invoice, balance, onView, onEdit, onDelete, onRecordPayment, onPrint }) {
  const canRecordPayment = balance.pending > 0 && invoice.status !== "draft";

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton label="View" icon={Eye} onClick={() => onView?.(invoice)} />
      <IconButton label="Edit" icon={Pencil} onClick={() => onEdit?.(invoice)} />
      <IconButton label="Print" icon={Printer} onClick={() => onPrint?.(invoice)} />
      {canRecordPayment && (
        <IconButton
          label="Record payment"
          icon={Wallet}
          onClick={() => onRecordPayment?.(invoice)}
        />
      )}
      <IconButton label="Delete" icon={Trash2} danger onClick={() => onDelete?.(invoice)} />
    </div>
  );
}

function InvoiceLink({ invoice }) {
  return (
    <Link
      to={`/invoices/${invoice.id}`}
      className="font-semibold text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {invoice.invoiceNumber}
    </Link>
  );
}

function Stat({ label, value, className = "" }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`tabular-nums text-navy-900 ${className}`.trim()}>{value}</dd>
    </div>
  );
}

export function InvoiceTable({ rows, onView, onEdit, onDelete, onRecordPayment, onPrint }) {
  const actionProps = { onView, onEdit, onDelete, onRecordPayment, onPrint };

  const columns = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      render: ({ invoice }) => <InvoiceLink invoice={invoice} />,
    },
    {
      key: "customerName",
      header: "Customer",
      render: ({ invoice }) => invoice.customerName || "—",
    },
    {
      key: "issueDate",
      header: "Invoice date",
      className: "whitespace-nowrap",
      render: ({ invoice }) => formatDate(invoice.issueDate) || "—",
    },
    {
      key: "dueDate",
      header: "Due date",
      className: "whitespace-nowrap",
      render: ({ invoice }) => formatDate(invoice.dueDate) || "—",
    },
    {
      key: "total",
      header: "Total",
      className: "text-right whitespace-nowrap",
      render: ({ balance }) => formatCurrency(balance.total),
    },
    {
      key: "paid",
      header: "Paid",
      className: "text-right whitespace-nowrap",
      render: ({ balance }) => formatCurrency(balance.paid),
    },
    {
      key: "pending",
      header: "Pending",
      className: "text-right whitespace-nowrap",
      render: ({ balance }) => (
        <span className={balance.pending > 0 ? "font-medium text-red-600" : ""}>
          {formatCurrency(balance.pending)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: ({ invoice }) => <InvoiceStatusBadge status={invoice.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (row) => <RowActions invoice={row.invoice} balance={row.balance} {...actionProps} />,
    },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.invoice.id}
          emptyText="No invoices found"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-slate-200/70 bg-white px-4 py-10 text-center text-slate-500 shadow-soft">
            No invoices found
          </p>
        )}
        {rows.map(({ invoice, balance }) => (
          <article
            key={invoice.id}
            className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <InvoiceLink invoice={invoice} />
                <p className="truncate text-sm text-slate-600">{invoice.customerName || "—"}</p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Stat label="Invoice date" value={formatDate(invoice.issueDate) || "—"} />
              <Stat label="Due date" value={formatDate(invoice.dueDate) || "—"} />
              <Stat label="Total" value={formatCurrency(balance.total)} />
              <Stat label="Paid" value={formatCurrency(balance.paid)} />
              <Stat
                label="Pending"
                value={formatCurrency(balance.pending)}
                className={balance.pending > 0 ? "font-medium text-red-600" : ""}
              />
            </dl>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <RowActions invoice={invoice} balance={balance} {...actionProps} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
