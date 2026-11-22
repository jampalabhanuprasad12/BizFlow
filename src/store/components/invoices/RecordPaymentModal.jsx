import { useEffect, useState } from "react";
import { Modal } from "../customers/Modal.jsx";
import { Button } from "../ui/index.js";
import { formatCurrency } from "../../lib/format.js";
import { todayISO } from "../../lib/invoices.js";

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank transfer"];

const INPUT_BASE =
  "w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none";
const inputClass = (invalid) => `${INPUT_BASE} ${invalid ? "border-red-400" : "border-slate-200"}`;

export function RecordPaymentModal({ open, invoice, pending = 0, onClose, onSubmit, error }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayISO());
  const [localError, setLocalError] = useState("");

  // Reset the form each time the modal opens for an invoice.
  useEffect(() => {
    if (!open) return;
    setAmount(String(pending));
    setMethod(PAYMENT_METHODS[0]);
    setDate(todayISO());
    setLocalError("");
  }, [open, invoice?.id, pending]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    let message = "";
    if (!(value > 0)) message = "Enter an amount greater than 0.";
    else if (value > pending + 0.005) {
      message = `Amount cannot exceed the pending balance of ${formatCurrency(pending)}.`;
    } else if (!date) message = "Choose a payment date.";

    setLocalError(message);
    if (message) return;

    onSubmit({ amount: Math.round(value * 100) / 100, method, date });
  };

  const message = localError || error || "";

  return (
    <Modal
      open={open}
      title="Record payment"
      description={invoice ? `${invoice.invoiceNumber} · ${invoice.customerName || "—"}` : ""}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Pending balance:{" "}
          <span className="font-semibold text-red-600">{formatCurrency(pending)}</span>
        </p>

        <div>
          <label htmlFor="payment-amount" className="mb-1.5 block text-sm font-medium text-navy-900">
            Amount
          </label>
          <input
            id="payment-amount"
            type="number"
            min="0"
            max={pending}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(message)}
            className={inputClass(Boolean(message))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payment-method" className="mb-1.5 block text-sm font-medium text-navy-900">
              Method
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className={inputClass(false)}
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment-date" className="mb-1.5 block text-sm font-medium text-navy-900">
              Date
            </label>
            <input
              id="payment-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass(false)}
            />
          </div>
        </div>

        {message && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Record payment</Button>
        </div>
      </form>
    </Modal>
  );
}
