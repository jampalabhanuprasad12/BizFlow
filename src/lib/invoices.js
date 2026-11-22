// Pure invoice helpers. No React imports.

export const INVOICE_STATUSES = ["draft", "unpaid", "partial", "paid", "overdue"];

export const INVOICE_STATUS_LABELS = {
  draft: "Draft",
  unpaid: "Unpaid",
  partial: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
};

const DEFAULT_NUMBER_BASE = 1000;

const round2 = (value) => Math.round((Number(value) || 0) * 100 + Number.EPSILON) / 100;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Local date as "yyyy-mm-dd". Accepts a Date, a "yyyy-mm-dd" string (returned as-is),
 * or undefined/null/anything else (falls back to the current local date).
 */
export function todayISO(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Converts a date-ish value to "yyyy-mm-dd", or "" when it cannot be parsed. */
function toISODate(value) {
  if (!value) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : todayISO(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : todayISO(parsed);
}

/**
 * Calculates subtotal, discount, tax and total for a list of line items.
 * Every money output is rounded to 2 decimals.
 */
export function calculateInvoiceTotals({
  items = [],
  discountType = "amount",
  discountValue = 0,
  taxRate = 0,
} = {}) {
  const rawSubtotal = (items || []).reduce((sum, item) => {
    const quantity = toNumber(item?.quantity);
    const unitPrice = toNumber(item?.unitPrice);
    return sum + quantity * unitPrice;
  }, 0);
  const subtotal = round2(rawSubtotal);

  const dv = toNumber(discountValue);
  const rawDiscount = discountType === "percent" ? (subtotal * dv) / 100 : dv;
  const discountAmount = round2(Math.min(Math.max(rawDiscount, 0), subtotal));

  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2((taxableAmount * toNumber(taxRate)) / 100);
  const total = round2(taxableAmount + taxAmount);

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

/** Derives the status from amounts, draft flag and due date. */
export function deriveInvoiceStatus(invoice, today = new Date()) {
  if (invoice.isDraft) return "draft";

  const total = toNumber(invoice.amount);
  const paid = toNumber(invoice.paidAmount || 0);

  if (total > 0 && paid >= total - 0.005) return "paid";
  if (paid > 0) return "partial";
  if (invoice.dueDate && invoice.dueDate < todayISO(today)) return "overdue";
  return "unpaid";
}

/** Returns { total, paid, pending } where pending never goes below zero. */
export function getInvoiceBalance(invoice) {
  const total = round2(toNumber(invoice.amount));
  const paid = round2(toNumber(invoice.paidAmount || 0));
  const pending = round2(Math.max(0, total - paid));
  return { total, paid, pending };
}

/** Next invoice number, e.g. "INV-1001" when no invoices exist. */
export function generateInvoiceNumber(invoices = [], prefix = "INV-") {
  let highest = DEFAULT_NUMBER_BASE;
  for (const invoice of invoices || []) {
    for (const candidate of [invoice?.invoiceNumber, invoice?.id]) {
      if (typeof candidate !== "string" || !candidate.startsWith(prefix)) continue;
      const match = candidate.match(/(\d+)$/);
      if (match) highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${prefix}${highest + 1}`;
}

/** Converts a raw (possibly legacy) invoice record into the full normalised shape. */
export function normalizeInvoice(raw, today = new Date()) {
  const hasItems = Array.isArray(raw.items) && raw.items.length > 0;

  const invoiceNumber = String(raw.invoiceNumber || raw.id || "");
  const dueDate = toISODate(raw.dueDate);
  const issueDate = toISODate(raw.issueDate || raw.dueDate);
  const discountType = raw.discountType === "percent" ? "percent" : "amount";
  const discountValue = toNumber(raw.discountValue);
  const taxRate = toNumber(raw.taxRate);

  const items = hasItems
    ? raw.items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        return {
          description: String(item.description ?? ""),
          quantity: quantity > 0 ? quantity : 1,
          unitPrice: unitPrice >= 0 ? unitPrice : 0,
        };
      })
    : [
        {
          description: raw.description || "Services",
          quantity: 1,
          unitPrice: toNumber(raw.amount),
        },
      ];

  let totals;
  if (hasItems) {
    totals = calculateInvoiceTotals({ items, discountType, discountValue, taxRate });
  } else {
    const amount = toNumber(raw.amount);
    totals = { subtotal: amount, discountAmount: 0, taxAmount: 0, total: amount };
  }

  const paidAmount =
    raw.paidAmount == null && raw.status === "paid" ? totals.total : toNumber(raw.paidAmount);

  const record = {
    id: String(raw.id ?? raw.invoiceNumber),
    invoiceNumber,
    customerId: raw.customerId || undefined,
    customerName: String(raw.customerName ?? "").trim(),
    issueDate,
    dueDate,
    items,
    discountType,
    discountValue,
    taxRate,
    notes: String(raw.notes ?? ""),
    isDraft: raw.isDraft === true || raw.status === "draft",
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    amount: totals.total,
    paidAmount,
  };

  return { ...record, status: deriveInvoiceStatus(record, today) };
}

/**
 * Filters by text query, status and issue-date range; sorted by issueDate, newest first.
 */
export function filterInvoices(
  invoices = [],
  { query = "", status = "all", dateFrom = "", dateTo = "" } = {},
  today = new Date()
) {
  const needle = String(query || "").trim().toLowerCase();

  return (invoices || [])
    .filter((invoice) => {
      if (needle) {
        const inText =
          String(invoice.invoiceNumber ?? "").toLowerCase().includes(needle) ||
          String(invoice.customerName ?? "").toLowerCase().includes(needle) ||
          (invoice.items || []).some((item) =>
            String(item.description ?? "").toLowerCase().includes(needle)
          );
        if (!inText) return false;
      }

      if (status && status !== "all" && deriveInvoiceStatus(invoice, today) !== status) {
        return false;
      }

      const issueDate = invoice.issueDate || "";
      if (dateFrom && issueDate < dateFrom) return false;
      if (dateTo && issueDate > dateTo) return false;

      return true;
    })
    .sort((a, b) => {
      const aDate = a.issueDate || "";
      const bDate = b.issueDate || "";
      if (aDate === bDate) return 0;
      return aDate < bDate ? 1 : -1;
    });
}
