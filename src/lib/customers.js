// Pure customer helpers. No React, no storage access.
// Invoices and payments link to customers by customerId when present; records
// without a customerId fall back to a case-insensitive customerName match.

import { toISODate } from "./dashboardMetrics.js";

const NAME_MIN = 2;
const NAME_MAX = 80;
const PHONE_MIN_LENGTH = 7;
const PHONE_MAX_LENGTH = 20;
const PHONE_MIN_DIGITS = 7;
const ADDRESS_MAX = 200;
const NOTES_MAX = 500;
const PHONE_PATTERN = /^[0-9+\-()\s]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOMER_ID_PATTERN = /^CUST-(\d+)$/;

const str = (v) => (v === undefined || v === null ? "" : String(v));
const trimmed = (v) => str(v).trim();
const lower = (v) => trimmed(v).toLowerCase();
const digitsOf = (v) => str(v).replace(/\D/g, "");
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const list = (v) => (Array.isArray(v) ? v : []);
const dayKey = (v) => str(v).slice(0, 10);
const sameId = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);

/**
 * Validates and normalises customer form values.
 * Returns { valid, errors: { name?, phone?, email? }, normalized }.
 * Address and notes are trimmed and truncated to their maximum lengths.
 */
export function validateCustomer(values = {}, { customers = [], excludeId } = {}) {
  const normalized = {
    name: trimmed(values.name),
    phone: trimmed(values.phone),
    email: trimmed(values.email),
    address: trimmed(values.address).slice(0, ADDRESS_MAX),
    notes: trimmed(values.notes).slice(0, NOTES_MAX),
  };
  const errors = {};

  if (!normalized.name) {
    errors.name = "Customer name is required.";
  } else if (normalized.name.length < NAME_MIN || normalized.name.length > NAME_MAX) {
    errors.name = `Name must be ${NAME_MIN}–${NAME_MAX} characters.`;
  }

  if (!normalized.phone) {
    errors.phone = "Phone number is required.";
  } else if (
    normalized.phone.length < PHONE_MIN_LENGTH ||
    normalized.phone.length > PHONE_MAX_LENGTH ||
    !PHONE_PATTERN.test(normalized.phone) ||
    digitsOf(normalized.phone).length < PHONE_MIN_DIGITS
  ) {
    errors.phone = "Enter a valid phone number (7–20 characters: digits, spaces, + - ( ))";
  }

  if (normalized.email && !EMAIL_PATTERN.test(normalized.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!errors.phone && !errors.email) {
    const duplicate = findDuplicateCustomer(customers, normalized, excludeId);
    if (duplicate) {
      if (digitsOf(duplicate.phone) === digitsOf(normalized.phone)) {
        errors.phone = "A customer with this phone number already exists.";
      } else {
        errors.email = "A customer with this email address already exists.";
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}

/**
 * Finds an existing customer that clashes with the given values.
 * A clash is: same phone digits, or same email (case-insensitive), or same
 * name (case-insensitive) with the same phone. The customer excludeId is skipped.
 */
export function findDuplicateCustomer(customers, { name, phone, email } = {}, excludeId) {
  const phoneDigits = digitsOf(phone);
  const emailLower = lower(email);
  const nameLower = lower(name);
  const skip = (c) => excludeId !== undefined && excludeId !== null && sameId(c.id, excludeId);

  const match = list(customers).find((c) => {
    if (skip(c)) return false;
    if (phoneDigits && digitsOf(c.phone) === phoneDigits) return true;
    if (emailLower && lower(c.email) === emailLower) return true;
    return Boolean(nameLower && phoneDigits && lower(c.name) === nameLower && digitsOf(c.phone) === phoneDigits);
  });
  return match || null;
}

/** Returns the next "CUST-0001"-style id, one greater than the highest existing suffix. */
export function generateCustomerId(customers) {
  const highest = list(customers).reduce((max, c) => {
    const found = CUSTOMER_ID_PATTERN.exec(str(c?.id));
    return found ? Math.max(max, Number(found[1])) : max;
  }, 0);
  return `CUST-${String(highest + 1).padStart(4, "0")}`;
}

/** True when an invoice or payment record belongs to the customer. */
export function matchesCustomer(record, customer) {
  if (!record || !customer) return false;
  if (record.customerId !== undefined && record.customerId !== null && record.customerId !== "") {
    return sameId(record.customerId, customer.id);
  }
  const recordName = lower(record.customerName);
  return recordName !== "" && recordName === lower(customer.name);
}

/**
 * Computes profile and table figures for one customer.
 * Draft invoices are excluded from totalAmount and pending balances.
 */
export function computeCustomerStats(customer, data = {}, today = new Date()) {
  const todayISO = toISODate(today);

  const invoices = list(data.invoices)
    .filter((inv) => matchesCustomer(inv, customer))
    .sort((a, b) => dayKey(b.issueDate).localeCompare(dayKey(a.issueDate)));
  const payments = list(data.payments)
    .filter((p) => matchesCustomer(p, customer))
    .sort((a, b) => dayKey(b.date).localeCompare(dayKey(a.date)));

  const nonDraft = invoices.filter((inv) => inv.status !== "draft");
  const open = nonDraft.filter((inv) => inv.status !== "paid");
  const balanceOf = (inv) => Math.max(0, num(inv.amount) - num(inv.paidAmount));
  const overdue = open.filter((inv) => balanceOf(inv) > 0 && dayKey(inv.dueDate) < todayISO);

  const sum = (items, valueOf) => items.reduce((total, item) => total + valueOf(item), 0);

  return {
    invoices,
    payments,
    invoiceCount: invoices.length,
    totalAmount: sum(nonDraft, (inv) => num(inv.amount)),
    amountPaid: sum(payments, (p) => num(p.amount)),
    pendingBalance: sum(open, balanceOf),
    overdueBalance: sum(overdue, balanceOf),
    overdueCount: overdue.length,
    lastPaymentDate: payments.length > 0 ? dayKey(payments[0].date) : null,
  };
}

/**
 * Filters customers by query. Digits in the query match phone numbers (digits only);
 * any text matches names as a case-insensitive substring. An empty query returns all.
 */
export function searchCustomers(customers, query) {
  const all = list(customers);
  const q = trimmed(query);
  if (!q) return all;

  const qLower = q.toLowerCase();
  const qDigits = digitsOf(q);
  return all.filter(
    (c) =>
      (qDigits !== "" && digitsOf(c.phone).includes(qDigits)) ||
      lower(c.name).includes(qLower)
  );
}
