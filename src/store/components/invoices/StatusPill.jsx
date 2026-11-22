import { INVOICE_STATUS_LABELS } from "../../lib/invoices.js";

const TONES = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  unpaid: "bg-blue-50 text-blue-700 ring-blue-200",
  partial: "bg-orange-50 text-orange-700 ring-orange-200",
  paid: "bg-green-50 text-green-700 ring-green-200",
  overdue: "bg-red-50 text-red-700 ring-red-200",
};

export function InvoiceStatusBadge({ status }) {
  const tone = TONES[status] ?? TONES.draft;
  const label = INVOICE_STATUS_LABELS[status] ?? String(status ?? "");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {label}
    </span>
  );
}
