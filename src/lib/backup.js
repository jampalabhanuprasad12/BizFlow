import { toCsv } from "./reports.js";
import { todayISO } from "./invoices.js";

export const BACKUP_FORMAT = "bizflow-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_COLLECTIONS = ["customers", "invoices", "payments", "expenses", "reminders", "followUps"];

export function buildBackup(data, now = new Date()) {
  const d = data || {};
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: d.settings || {},
    customers: [...(d.customers || [])],
    invoices: [...(d.invoices || [])],
    payments: [...(d.payments || [])],
    expenses: [...(d.expenses || [])],
    reminders: [...(d.reminders || [])],
    followUps: [...(d.followUps || [])],
  };
}

export function backupToJson(data, now) {
  return JSON.stringify(buildBackup(data, now), null, 2);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseBackup(text) {
  try {
    if (typeof text !== "string" || text.length === 0 || text.length > 20000000) {
      return { ok: false, error: "The file is empty or too large." };
    }
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed) || parsed.format !== BACKUP_FORMAT) {
      return { ok: false, error: "This file is not a BizFlow backup." };
    }
    if (typeof parsed.version !== "number" || parsed.version > BACKUP_VERSION) {
      return { ok: false, error: "This backup was made by a newer version of BizFlow." };
    }

    let skipped = 0;
    const data = { settings: isPlainObject(parsed.settings) ? parsed.settings : {} };

    for (const key of BACKUP_COLLECTIONS) {
      const value = parsed[key];
      if (value === undefined) {
        data[key] = [];
        continue;
      }
      if (!Array.isArray(value)) {
        return { ok: false, error: `The "${key}" section of this backup is invalid.` };
      }
      data[key] = value.filter((item) => {
        const valid =
          item !== null &&
          typeof item === "object" &&
          (typeof item.id === "string" || (typeof item.id === "number" && Number.isFinite(item.id)));
        if (!valid) skipped += 1;
        return valid;
      });
    }

    return { ok: true, data, skipped };
  } catch (err) {
    return { ok: false, error: "This file could not be read as a BizFlow backup." };
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function invoiceCsvRows(data) {
  const invoices = (data && data.invoices) || [];
  const today = todayISO();
  return invoices.map((inv) => {
    const amount = Number(inv.amount) || 0;
    const paidAmount = Number(inv.paidAmount) || 0;
    const pendingAmount = round2(Math.max(0, amount - paidAmount));
    const dueDate = inv.dueDate || "";
    let status;
    if (inv.isDraft) status = "draft";
    else if (amount > 0 && paidAmount >= amount) status = "paid";
    else if (paidAmount > 0) status = "partial";
    else if (dueDate < today) status = "overdue";
    else status = "unpaid";
    return {
      invoiceNumber: inv.invoiceNumber || "",
      customerName: inv.customerName || "",
      issueDate: inv.issueDate || "",
      dueDate,
      amount,
      paidAmount,
      pendingAmount,
      status,
      discountAmount: Number(inv.discountAmount) || 0,
      taxAmount: Number(inv.taxAmount) || 0,
    };
  });
}

export function paymentCsvRows(data) {
  const payments = (data && data.payments) || [];
  return payments.map((p) => ({
    id: p.id ?? "",
    date: p.date || "",
    customerName: p.customerName || "",
    invoiceId: p.invoiceId ?? "",
    method: p.method || "",
    reference: p.reference || "",
    amount: Number(p.amount) || 0,
    notes: p.notes || "",
  }));
}

export function expenseCsvRows(data) {
  const expenses = (data && data.expenses) || [];
  return expenses.map((e) => ({
    id: e.id ?? "",
    name: e.name || "",
    category: e.category || "",
    expenseDate: e.expenseDate || "",
    dueDate: e.dueDate || "",
    amount: Number(e.amount) || 0,
    status: e.status || "",
    paidDate: e.paidDate || "",
    paymentMethod: e.paymentMethod || "",
    frequency: e.recurring?.frequency || "none",
    notes: e.notes || "",
  }));
}

export const INVOICE_CSV_COLUMNS = [
  { key: "invoiceNumber", label: "Invoice number" },
  { key: "customerName", label: "Customer" },
  { key: "issueDate", label: "Issue date" },
  { key: "dueDate", label: "Due date" },
  { key: "amount", label: "Total" },
  { key: "paidAmount", label: "Paid" },
  { key: "pendingAmount", label: "Pending" },
  { key: "status", label: "Status" },
  { key: "discountAmount", label: "Discount" },
  { key: "taxAmount", label: "GST" },
];

export const PAYMENT_CSV_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date" },
  { key: "customerName", label: "Customer" },
  { key: "invoiceId", label: "Invoice ID" },
  { key: "method", label: "Method" },
  { key: "reference", label: "Reference" },
  { key: "amount", label: "Amount" },
  { key: "notes", label: "Notes" },
];

export const EXPENSE_CSV_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "expenseDate", label: "Expense date" },
  { key: "dueDate", label: "Due date" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "paidDate", label: "Paid date" },
  { key: "paymentMethod", label: "Payment method" },
  { key: "frequency", label: "Frequency" },
  { key: "notes", label: "Notes" },
];

export function exportInvoicesCsv(data) {
  return toCsv(invoiceCsvRows(data), INVOICE_CSV_COLUMNS);
}

export function exportPaymentsCsv(data) {
  return toCsv(paymentCsvRows(data), PAYMENT_CSV_COLUMNS);
}

export function exportExpensesCsv(data) {
  return toCsv(expenseCsvRows(data), EXPENSE_CSV_COLUMNS);
}

export function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
