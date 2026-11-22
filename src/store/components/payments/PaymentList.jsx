import { Wallet } from "lucide-react";
import { DataTable, EmptyState } from "../ui/index.js";
import { matchesCustomer } from "../../lib/customers.js";
import { formatCurrency, formatDate } from "../../lib/format.js";

function customerNameFor(payment, customers) {
  const customer = (customers ?? []).find((c) => matchesCustomer(payment, c));
  return customer?.name || payment.customerName || "Unknown customer";
}

export function PaymentList({ payments, customers }) {
  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payments found"
        description="Recorded payments will appear here. Try clearing the filters or record a new payment."
      />
    );
  }

  const columns = [
    { key: "date", header: "Date", render: (p) => formatDate(p.date) },
    { key: "customer", header: "Customer", render: (p) => customerNameFor(p, customers) },
    { key: "invoiceId", header: "Invoice", render: (p) => p.invoiceId },
    { key: "method", header: "Method", render: (p) => p.method },
    { key: "reference", header: "Reference", render: (p) => p.reference || "—" },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (p) => (
        <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
      ),
    },
    { key: "notes", header: "Notes", render: (p) => p.notes || "—" },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} rows={payments} rowKey="id" emptyText="No payments found" />
      </div>

      <ul className="space-y-3 md:hidden">
        {payments.map((p) => (
          <li key={p.id} className="card-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">
                  {customerNameFor(p, customers)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.invoiceId} · {formatDate(p.date)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-green-600">
                {formatCurrency(p.amount)}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400">Method</dt>
                <dd>{p.method}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Reference</dt>
                <dd className="truncate">{p.reference || "—"}</dd>
              </div>
              {p.notes && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Notes</dt>
                  <dd>{p.notes}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
