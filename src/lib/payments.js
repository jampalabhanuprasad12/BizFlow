// Pure payment helpers. No React imports.
import { formatCurrency } from "./format.js";
import { getInvoiceBalance, todayISO } from "./invoices.js";

export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Other"];

const REFERENCE_REQUIRED_METHODS = ["UPI", "Bank Transfer"];
const NOTES_MAX_LENGTH = 300;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const round2 = (value) => Math.round((Number(value) || 0) * 100 + Number.EPSILON) / 100;
const text = (value) => (value === undefined || value === null ? "" : String(value).trim());

// Blank strings must not coerce to 0 and pass as a valid amount.
const parseAmount = (value) => (typeof value === "string" && value.trim() === "" ? NaN : Number(value));

/** Accepts "yyyy-mm-dd" (or a Date) and returns "yyyy-mm-dd", or "" when unusable. */
function toDay(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : todayISO(value);
  const str = text(value).slice(0, 10);
  if (!DATE_PATTERN.test(str)) return "";
  return Number.isNaN(new Date(`${str}T00:00:00`).getTime()) ? "" : str;
}

/** Returns the first payment on the same invoice that matches the given details, or null. */
export function findDuplicatePayment({ existingPayments = [], invoiceId, amount, date, reference } = {}) {
  const id = text(invoiceId);
  if (!id) return null;
  const ref = text(reference).toLowerCase();
  const amountValue = round2(amount);
  const day = toDay(date);

  for (const payment of existingPayments || []) {
    if (text(payment?.invoiceId) !== id) continue;
    const priorRef = text(payment.reference).toLowerCase();
    // A non-empty reference that matches blocks regardless of amount or date.
    if (ref && priorRef === ref) return payment;
    const sameAmount = round2(payment.amount) === amountValue;
    const sameDate = toDay(payment.date) === day;
    // Otherwise both references must be empty to count as a duplicate.
    if (sameAmount && sameDate && ref === priorRef) return payment;
  }
  return null;
}

/** Payments recorded against one invoice, newest date first. */
export function paymentsForInvoice(payments = [], invoiceId) {
  const id = text(invoiceId);
  if (!id) return [];
  return (payments || [])
    .filter((payment) => text(payment?.invoiceId) === id)
    .sort((a, b) => {
      const aDate = toDay(a.date);
      const bDate = toDay(b.date);
      if (aDate === bDate) return 0;
      return aDate < bDate ? 1 : -1;
    });
}

/** Total received, and the amount received in the same calendar month as `today`. */
export function computePaymentTotals(payments = [], today) {
  const month = (toDay(today) || todayISO()).slice(0, 7);
  let totalReceived = 0;
  let receivedThisMonth = 0;

  for (const payment of payments || []) {
    const amount = Number(payment?.amount) || 0;
    totalReceived += amount;
    if (toDay(payment?.date).slice(0, 7) === month) receivedThisMonth += amount;
  }

  return { totalReceived: round2(totalReceived), receivedThisMonth: round2(receivedThisMonth) };
}

/**
 * Validates a payment against its invoice.
 * Returns { valid, errors, normalized }; `errors` is keyed by field, plus `duplicate`.
 */
export function validatePayment({
  invoice,
  amount,
  method,
  date,
  reference,
  notes,
  existingPayments = [],
  today,
} = {}) {
  const errors = {};
  const rawAmount = parseAmount(amount);
  const amountValue = Number.isFinite(rawAmount) ? round2(rawAmount) : 0;

  const normalized = {
    amount: amountValue,
    method: text(method),
    date: toDay(date),
    reference: text(reference),
    notes: text(notes).slice(0, NOTES_MAX_LENGTH),
  };

  const pending = invoice ? getInvoiceBalance(invoice).pending : 0;

  if (!invoice) {
    errors.invoice = "Select an invoice to record a payment against.";
  } else if (invoice.isDraft || invoice.status === "draft") {
    errors.invoice = "Draft invoices cannot receive payments.";
  }

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  } else if (invoice && pending <= 0) {
    errors.amount = "This invoice is already fully paid.";
  } else if (invoice && amountValue > pending) {
    errors.amount = "Amount cannot exceed the outstanding balance of " + formatCurrency(pending);
  }

  if (!PAYMENT_METHODS.includes(normalized.method)) {
    errors.method = "Select a payment method.";
  }

  const todayDay = toDay(today) || todayISO();
  const issueDate = invoice ? toDay(invoice.issueDate) : "";
  if (!normalized.date) {
    errors.date = "Enter a valid payment date.";
  } else if (normalized.date > todayDay) {
    errors.date = "Payment date cannot be in the future.";
  } else if (issueDate && normalized.date < issueDate) {
    errors.date = "Payment date cannot be before the invoice issue date.";
  }

  if (REFERENCE_REQUIRED_METHODS.includes(normalized.method) && !normalized.reference) {
    errors.reference = "Enter the UPI/bank transaction reference";
  }

  if (invoice) {
    const duplicate = findDuplicatePayment({
      existingPayments,
      invoiceId: invoice.id,
      amount: amountValue,
      date: normalized.date,
      reference: normalized.reference,
    });
    if (duplicate) errors.duplicate = "This payment looks like a duplicate of one already recorded.";
  }

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}
