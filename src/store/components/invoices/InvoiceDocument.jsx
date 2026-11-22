import { Zap } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/format.js";
import { deriveInvoiceStatus, getInvoiceBalance } from "../../lib/invoices.js";
import { InvoiceStatusBadge } from "./StatusPill.jsx";

const dash = (value) => (value && String(value).trim() ? value : "—");

function TotalLine({ label, value, bold = false, strong = false }) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        strong ? "border-t border-slate-900 pt-2 text-base font-bold text-navy-900" : "text-slate-600"
      } ${bold ? "font-bold text-navy-900" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function InvoiceDocument({ invoice, business = {}, customer }) {
  const items = invoice.items ?? [];
  const status = invoice.status ?? deriveInvoiceStatus(invoice);
  const { paid, pending } = getInvoiceBalance(invoice);
  const subtotal = Number(invoice.subtotal) || 0;
  const discountAmount = Number(invoice.discountAmount) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const taxRate = Number(invoice.taxRate) || 0;
  const total = Number(invoice.amount) || 0;
  const customerName = customer?.name ?? invoice.customerName;

  return (
    <div className="invoice-print mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-navy-900 shadow-sm sm:p-10">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {business.logoDataUrl ? (
              <img src={business.logoDataUrl} alt={business.businessName || "Business logo"} className="h-14 w-14 rounded-xl object-contain" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-bold text-white shadow-sm">
                B
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-lg font-semibold">{business.businessName || "BizFlow"}</span>
            </div>
          </div>
          <div className="space-y-0.5 text-sm text-slate-600">
            <p>{dash(business.businessAddress)}</p>
            <p>Phone: {dash(business.businessPhone)}</p>
            <p>Email: {dash(business.businessEmail)}</p>
            {business.gstin && <p>GSTIN: {business.gstin}</p>}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <h2 className="text-2xl font-bold tracking-wide text-navy-900">TAX INVOICE</h2>
          <div className="mt-2 space-y-0.5 text-sm text-slate-600">
            <p>
              <span className="text-slate-500">Invoice no: </span>
              <span className="font-medium text-navy-900">{invoice.invoiceNumber}</span>
            </p>
            <p>
              <span className="text-slate-500">Issue date: </span>
              {formatDate(invoice.issueDate) || "—"}
            </p>
            <p>
              <span className="text-slate-500">Due date: </span>
              {formatDate(invoice.dueDate) || "—"}
            </p>
          </div>
          <div className="mt-3 flex sm:justify-end">
            <InvoiceStatusBadge status={status} />
          </div>
        </div>
      </header>

      <section className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</h3>
        <p className="mt-1 font-semibold text-navy-900">{dash(customerName)}</p>
        <p className="text-sm text-slate-600">Phone: {dash(customer?.phone)}</p>
        <p className="text-sm text-slate-600">Email: {dash(customer?.email)}</p>
        <p className="text-sm text-slate-600">Address: {dash(customer?.address)}</p>
      </section>

      <section className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-2">#</th>
              <th scope="col" className="py-2">Description</th>
              <th scope="col" className="py-2 text-right">Qty</th>
              <th scope="col" className="py-2 text-right">Unit price</th>
              <th scope="col" className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const quantity = Number(item.quantity) || 0;
              const unitPrice = Number(item.unitPrice) || 0;
              return (
                <tr key={`${index}-${item.description}`}>
                  <td className="py-2.5 pr-2 text-slate-500">{index + 1}</td>
                  <td className="py-2.5">{item.description}</td>
                  <td className="py-2.5 text-right tabular-nums">{quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatCurrency(unitPrice)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatCurrency(quantity * unitPrice)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="space-y-2 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment information
          </h3>
          {business.paymentInstructions && (
            <p className="whitespace-pre-line text-slate-600">{business.paymentInstructions}</p>
          )}
          {business.upiId && <p className="text-slate-600">UPI ID: {business.upiId}</p>}
          {invoice.notes && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
              <p className="mt-1 whitespace-pre-line text-slate-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <TotalLine label="Subtotal" value={formatCurrency(subtotal)} />
          {discountAmount > 0 && (
            <TotalLine label="Discount" value={`-${formatCurrency(discountAmount)}`} />
          )}
          <TotalLine label="Taxable amount" value={formatCurrency(subtotal - discountAmount)} />
          {taxRate > 0 && (
            <TotalLine label={`GST at ${taxRate}%`} value={formatCurrency(taxAmount)} />
          )}
          <TotalLine label="Total" value={formatCurrency(total)} strong />
          <TotalLine label="Paid" value={formatCurrency(paid)} />
          <TotalLine label="Balance due" value={formatCurrency(pending)} bold />
        </dl>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
        Thank you for your business.
      </footer>
    </div>
  );
}
