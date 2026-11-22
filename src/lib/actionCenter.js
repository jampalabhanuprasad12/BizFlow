// Smart Action Center: turns invoices, bills and the cash forecast into prioritised actions.
// Pure functions: no React, no storage access, no external calls. Inputs are never mutated.

import { deriveInvoiceStatus, getInvoiceBalance, todayISO } from "./invoices.js";
import { getExpenseDaysRemaining } from "./expenses.js";
import { computeCashForecast, daysBetween } from "./cashForecast.js";
import { formatCurrency, formatDate } from "./format.js";

export const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2 };

const round2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;
const OPEN_STATUSES = ["unpaid", "partial", "overdue"];
const URGENT_OVERDUE_AMOUNT = 10000;
const URGENT_OVERDUE_DAYS = 15;
const CASH_HORIZON_DAYS = 90;
const CASH_LOW_THRESHOLD = 1000;

/** Copy of the actions sorted by priority, then amount (largest first; null amounts last). */
export function sortActions(actions = []) {
  return [...(actions || [])].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    const aAmount = a.amount == null ? null : Number(a.amount);
    const bAmount = b.amount == null ? null : Number(b.amount);
    if (aAmount === bAmount) return 0;
    if (aAmount === null) return 1;
    if (bAmount === null) return -1;
    return bAmount - aAmount;
  });
}

// Open invoices: not draft, not paid, with money still pending.
function openInvoices(invoices, today) {
  return (invoices || []).filter((invoice) => {
    if (!invoice) return false;
    const status = deriveInvoiceStatus(invoice, today);
    return OPEN_STATUSES.includes(status) && getInvoiceBalance(invoice).pending > 0;
  });
}

const customerKey = (invoice) => String(invoice.customerId || invoice.customerName || "");

/**
 * Builds the recommended actions for the given data as of `today` (ISO day or Date).
 * Each action: { id, kind, priority, title, detail, amount, actionLabel, actionTo }.
 */
export function buildActions(data, today = todayISO()) {
  const day = todayISO(today);
  const src = data || {};
  const actions = [];
  const open = openInvoices(src.invoices, day);

  // 1. Follow up with customers who have overdue invoices.
  const byCustomer = new Map();
  for (const invoice of open) {
    const key = customerKey(invoice);
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key).push(invoice);
  }
  for (const [key, group] of byCustomer) {
    const overdue = group.filter((invoice) => deriveInvoiceStatus(invoice, day) === "overdue");
    if (overdue.length === 0) continue;
    const overdueBalance = round2(
      overdue.reduce((sum, invoice) => sum + getInvoiceBalance(invoice).pending, 0)
    );
    const maxDaysOverdue = Math.max(...overdue.map((invoice) => daysBetween(invoice.dueDate, day)));
    const name = overdue[0].customerName || key;
    const urgent = overdueBalance >= URGENT_OVERDUE_AMOUNT || maxDaysOverdue > URGENT_OVERDUE_DAYS;
    actions.push({
      id: "follow-up-" + key,
      kind: "follow_up_overdue",
      priority: urgent ? "urgent" : "high",
      title: "Follow up with " + name + " – " + formatCurrency(overdueBalance) + " overdue",
      detail: `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}, up to ${maxDaysOverdue} days late`,
      amount: overdueBalance,
      actionLabel: "Open invoices",
      actionTo: "/invoices?status=overdue",
    });
  }

  // 2. Several customers with pending payments.
  const customerCount = new Set(open.map(customerKey)).size;
  if (customerCount >= 2) {
    const total = round2(open.reduce((sum, invoice) => sum + getInvoiceBalance(invoice).pending, 0));
    actions.push({
      id: "pending-payments",
      kind: "pending_payments",
      priority: "normal",
      title: customerCount + " customers have pending payments",
      detail: "Total pending " + formatCurrency(total),
      amount: total,
      actionLabel: "Review customers",
      actionTo: "/customers",
    });
  }

  // 3. Unpaid bills by days remaining.
  for (const expense of src.expenses || []) {
    if (!expense || expense.status === "paid") continue;
    const days = getExpenseDaysRemaining(expense, day);
    const amount = round2(expense.amount);
    const name = expense.name || "bill";
    let kind;
    let priority;
    let title;
    if (days < 0) {
      kind = "bill_overdue";
      priority = "urgent";
      title = "Pay " + name + " – " + formatCurrency(amount) + " overdue";
    } else if (days <= 1) {
      kind = "bill_due_soon";
      priority = "high";
      title = "Pay " + name + " – " + formatCurrency(amount) + (days === 0 ? " due today" : " due tomorrow");
    } else if (days <= 7) {
      kind = "bill_upcoming";
      priority = "normal";
      title = "Pay " + name + " – " + formatCurrency(amount) + " due in " + days + " days";
    } else {
      continue;
    }
    actions.push({
      id: "bill-" + expense.id,
      kind,
      priority,
      title,
      detail: expense.category ? String(expense.category) : "",
      amount,
      actionLabel: "Open bills",
      actionTo: "/bills",
    });
  }

  // 4. Open invoices expected today.
  for (const invoice of open) {
    if (invoice.dueDate !== day) continue;
    const pending = getInvoiceBalance(invoice).pending;
    actions.push({
      id: "invoice-due-" + invoice.id,
      kind: "invoice_due_today",
      priority: "high",
      title:
        "Invoice " + invoice.invoiceNumber + " payment expected today – " + formatCurrency(pending),
      detail: invoice.customerName ? String(invoice.customerName) : "",
      amount: pending,
      actionLabel: "Record payment",
      actionTo: "/payments?invoice=" + encodeURIComponent(invoice.id),
    });
  }

  // 5. Cash forecast warnings.
  const forecast = computeCashForecast(src, { today: day, horizonDays: CASH_HORIZON_DAYS });
  const summary = forecast.summary;
  if (summary.hasShortage && summary.shortageDates && summary.shortageDates.length > 0) {
    const days = daysBetween(day, summary.shortageDates[0].from);
    const when = days <= 0 ? "today" : "in " + days + " days";
    actions.push({
      id: "cash-shortage",
      kind: "cash_shortage",
      priority: "urgent",
      title: "Cash balance may become negative " + when,
      detail: "Lowest projected balance " + formatCurrency(summary.lowestBalance),
      amount: null,
      actionLabel: "Open cash flow",
      actionTo: "/cash-flow",
    });
  } else if (summary.lowestBalance < CASH_LOW_THRESHOLD) {
    actions.push({
      id: "cash-low",
      kind: "cash_low",
      priority: "high",
      title: "Cash balance may drop below ₹1,000 on " + formatDate(summary.lowestDate),
      detail: "Lowest projected balance " + formatCurrency(summary.lowestBalance),
      amount: null,
      actionLabel: "Open cash flow",
      actionTo: "/cash-flow",
    });
  }

  // Deduplicate by id (first occurrence wins), then sort.
  const unique = new Map();
  for (const action of actions) {
    if (!unique.has(action.id)) unique.set(action.id, action);
  }
  return sortActions([...unique.values()]);
}
