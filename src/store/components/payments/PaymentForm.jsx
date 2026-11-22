import { useState } from "react";
import { Button } from "../ui/index.js";
import { PAYMENT_METHODS, validatePayment } from "../../lib/payments.js";
import { getInvoiceBalance, todayISO } from "../../lib/invoices.js";
import { formatCurrency } from "../../lib/format.js";

const REQUIRES_REFERENCE = ["UPI", "Bank Transfer"];

const inputClass = (hasError) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-navy-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
    hasError ? "border-red-400" : "border-slate-200"
  }`;

const labelClass = "block text-sm font-medium text-slate-700";
const errorClass = "mt-1 text-xs text-red-600";

export function PaymentForm({ invoice, existingPayments, onSubmit, onCancel }) {
  const pending = getInvoiceBalance(invoice).pending;
  const [amount, setAmount] = useState(String(pending));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  const referenceRequired = REQUIRES_REFERENCE.includes(method);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = validatePayment({
      invoice,
      amount,
      method,
      date,
      reference,
      notes,
      existingPayments,
      today: todayISO(),
    });
    setErrors(result.errors ?? {});
    if (result.valid) onSubmit(result.normalized);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="payment-amount" className={labelClass}>
            Amount (₹)
          </label>
          <Button size="sm" variant="secondary" onClick={() => setAmount(String(pending))}>
            Full payment
          </Button>
        </div>
        <input
          id="payment-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass(Boolean(errors.amount))}
          aria-invalid={Boolean(errors.amount)}
        />
        <p className="mt-1 text-xs text-slate-500">Outstanding: {formatCurrency(pending)}</p>
        {errors.amount && <p className={errorClass}>{errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="payment-method" className={`mb-1.5 ${labelClass}`}>
          Payment method
        </label>
        <select
          id="payment-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={inputClass(Boolean(errors.method))}
          aria-invalid={Boolean(errors.method)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {errors.method && <p className={errorClass}>{errors.method}</p>}
      </div>

      <div>
        <label htmlFor="payment-date" className={`mb-1.5 ${labelClass}`}>
          Payment date
        </label>
        <input
          id="payment-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass(Boolean(errors.date))}
          aria-invalid={Boolean(errors.date)}
        />
        {errors.date && <p className={errorClass}>{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="payment-reference" className={`mb-1.5 ${labelClass}`}>
          Transaction reference
          {referenceRequired && <span className="text-red-500"> *</span>}
        </label>
        <input
          id="payment-reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={referenceRequired ? "UTR / transaction ID" : "Optional"}
          className={inputClass(Boolean(errors.reference))}
          aria-invalid={Boolean(errors.reference)}
        />
        {errors.reference && <p className={errorClass}>{errors.reference}</p>}
      </div>

      <div>
        <label htmlFor="payment-notes" className={`mb-1.5 ${labelClass}`}>
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="payment-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass(false)}
        />
      </div>

      {errors.duplicate && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.duplicate}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Record payment</Button>
      </div>
    </form>
  );
}
