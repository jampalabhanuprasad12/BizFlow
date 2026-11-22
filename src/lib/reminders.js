import { matchesCustomer } from "./customers.js";
import { deriveInvoiceStatus, getInvoiceBalance } from "./invoices.js";
import { formatCurrency, formatDate } from "./format.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const BUCKET_META = {
  due_today: { label: "Due today", tone: "blue" },
  overdue_1_7: { label: "Overdue 1–7 days", tone: "orange" },
  overdue_8_15: { label: "Overdue 8–15 days", tone: "red" },
  overdue_15_plus: { label: "Overdue 15+ days", tone: "red" },
};

// Converts a yyyy-mm-dd string (or a Date) to a UTC midnight timestamp so that
// day differences are whole numbers regardless of DST or the local timezone.
function toUtcDay(value) {
  if (value instanceof Date) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(dueDate, today) {
  return Math.round((toUtcDay(today) - toUtcDay(dueDate)) / DAY_MS);
}

export function getReminderBucket(invoice, today) {
  if (!invoice || !invoice.dueDate) return null;
  if (getInvoiceBalance(invoice).pending <= 0) return null;
  if (deriveInvoiceStatus(invoice, today) === "draft") return null;

  const days = daysBetween(invoice.dueDate, today);
  if (days < 0) return null;
  if (days === 0) return "due_today";
  if (days <= 7) return "overdue_1_7";
  if (days <= 15) return "overdue_8_15";
  return "overdue_15_plus";
}

export function buildReminders(invoices, customers, today) {
  return (invoices ?? [])
    .map((invoice) => {
      const bucket = getReminderBucket(invoice, today);
      if (!bucket) return null;
      return {
        invoice,
        customer: (customers ?? []).find((c) => matchesCustomer(invoice, c)),
        bucket,
        balance: getInvoiceBalance(invoice),
        daysOverdue: daysBetween(invoice.dueDate, today),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function buildReminderMessage({ customerName, invoiceNumber, amount, dueDate, businessName }) {
  return `Hello ${customerName}, this is a friendly reminder regarding invoice ${invoiceNumber} for ${formatCurrency(amount)}. The payment was due on ${formatDate(dueDate)}. Kindly complete the payment at your earliest convenience. Thank you! — ${businessName}`;
}

export function buildWhatsAppUrl(phone, message) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function getFollowUpsForInvoice(followUps, invoiceId) {
  return (followUps ?? [])
    .filter((f) => String(f.invoiceId) === String(invoiceId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
