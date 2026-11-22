// Pure dashboard calculations. No React, no storage access.
// Dates are ISO "yyyy-mm-dd" strings (local calendar days). Comparing those
// strings lexicographically gives the correct chronological order.

import { formatCurrency } from "./format.js";
import { deriveInvoiceStatus, getInvoiceBalance } from "./invoices.js";

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EXPECTED_WINDOW_DAYS = 30; // horizon for expected cash and upcoming expenses
const BILL_ALERT_DAYS = 7; // horizon for "upcoming bill" alerts
const CASH_FLOOR = 500; // balances below this trigger a cash shortage alert
const RECENT_LIMIT = 8;
const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };
const OPEN_INVOICE_STATUSES = ["unpaid", "partial", "overdue"];

const pad = (n) => String(n).padStart(2, "0");
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;
const list = (v) => (Array.isArray(v) ? v : []);
const dayKey = (v) => String(v || "").slice(0, 10);
const monthKey = (v) => String(v || "").slice(0, 7);
const inRange = (iso, fromISO, toISO) => iso >= fromISO && iso <= toISO;

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Parses "yyyy-mm-dd" as a local calendar date (avoids UTC off-by-one).
export function parseISODate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Accepts "yyyy-mm-dd", ISO timestamps, or Date objects. Returns "yyyy-mm-dd".
export function normalizeDate(value, fallback = toISODate(new Date())) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (value instanceof Date || (typeof value === "string" && value.trim() !== "")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return toISODate(d);
  }
  return fallback;
}

// Sums valueOf(item) for each item, grouped by keyOf(item).
function groupSum(items, keyOf, valueOf) {
  const totals = {};
  for (const item of items) {
    const key = keyOf(item);
    totals[key] = (totals[key] || 0) + valueOf(item);
  }
  return totals;
}

function lastSixMonths(today) {
  return Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1);
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: MONTH_LABELS[d.getMonth()],
    };
  });
}

/**
 * Computes all dashboard metrics from the stored data.
 *
 * Expected cash balance (30-day horizon, from today):
 *   expectedCashBalance =
 *       cashOpeningBalance
 *     + paymentsReceived                      (all recorded payments)
 *     - sum(paid expenses)                    (all expenses with status "paid")
 *     + expectedInflow30                      (remaining balance of open invoices due in [today, today+30])
 *     - expectedOutflow30                     (unpaid expenses due in [today, today+30])
 *
 * Overdue invoices are excluded from expectedInflow30 because their timing is
 * uncertain; they are still reported in the overdue KPIs and alerts.
 */
export function computeDashboard(data = {}, today = new Date()) {
  const invoices = list(data.invoices);
  const payments = list(data.payments);
  const expenses = list(data.expenses);
  const reminders = list(data.reminders);
  const settings = data.settings || {};
  const opening = num(settings.cashOpeningBalance);
  const currency = settings.currency || "INR";

  const todayISO = toISODate(today);
  const horizonISO = toISODate(addDays(today, EXPECTED_WINDOW_DAYS));
  const billHorizonISO = toISODate(addDays(today, BILL_ALERT_DAYS));
  const year = today.getFullYear();

  // ---- Invoice helpers -------------------------------------------------
  const statusOf = (inv) => deriveInvoiceStatus(inv, today);
  const isOpen = (inv) => OPEN_INVOICE_STATUSES.includes(statusOf(inv));
  const remaining = (inv) => getInvoiceBalance(inv).pending;
  const isOverdue = (inv) => statusOf(inv) === "overdue";

  // ---- Expense helpers -------------------------------------------------
  // Expenses use status "paid" | "unpaid", expenseDate (when incurred) and dueDate (when payable).
  const isPaidExpense = (e) => e.status === "paid";
  const isUnpaidExpense = (e) => e.status !== "paid";
  const expenseDay = (e) => dayKey(e.expenseDate);
  const dueDay = (e) => dayKey(e.dueDate);

  const nonDraftInvoices = invoices.filter((i) => statusOf(i) !== "draft");
  const openInvoices = invoices.filter(isOpen);
  const overdueInvoices = invoices.filter(isOverdue);
  const unpaidExpenses = expenses.filter(isUnpaidExpense);
  const paidExpenses = expenses.filter(isPaidExpense);

  // ---- KPIs ------------------------------------------------------------
  const sum = (items, valueOf) => items.reduce((total, item) => total + valueOf(item), 0);
  const amountOf = (r) => num(r.amount);

  const totalRevenue = sum(
    nonDraftInvoices.filter((i) => String(i.issueDate).slice(0, 4) === String(year)),
    amountOf
  );
  const paymentsReceived = sum(payments, amountOf);
  const outstanding = sum(openInvoices, remaining);
  const overdueAmount = sum(overdueInvoices, remaining);

  // Unpaid bills due today through the next 30 days; overdue bills are not included.
  const upcomingBills = unpaidExpenses.filter((e) => inRange(dueDay(e), todayISO, horizonISO));
  const upcomingExpenses = sum(upcomingBills, amountOf);

  const expectedInflow30 = sum(
    openInvoices.filter((i) => inRange(dayKey(i.dueDate), todayISO, horizonISO)),
    remaining
  );
  const expectedOutflow30 = upcomingExpenses;
  const paidExpensesTotal = sum(paidExpenses, amountOf);
  const expectedCashBalance =
    opening + paymentsReceived - paidExpensesTotal + expectedInflow30 - expectedOutflow30;

  const kpis = {
    totalRevenue,
    paymentsReceived,
    outstanding,
    overdueCount: overdueInvoices.length,
    overdueAmount,
    upcomingExpenses,
    upcomingExpensesCount: upcomingBills.length,
    expectedCashBalance,
    expectedInflow30,
    expectedOutflow30,
  };

  // ---- Monthly charts (last 6 calendar months) -------------------------
  const months = lastSixMonths(today);
  const paymentsByMonth = groupSum(payments, (p) => monthKey(p.date), amountOf);
  // Paid expenses count as outflow in the month they were paid for (expenseDate).
  const expensesByMonth = groupSum(paidExpenses, (e) => monthKey(e.expenseDate), amountOf);
  const invoicedByMonth = groupSum(nonDraftInvoices, (i) => monthKey(i.issueDate), amountOf);

  const monthlyIncomeExpense = months.map((m) => ({
    month: m.label,
    income: paymentsByMonth[m.key] || 0,
    expenses: expensesByMonth[m.key] || 0,
  }));

  const collectionTrend = months.map((m) => ({
    month: m.label,
    invoiced: invoicedByMonth[m.key] || 0,
    collected: paymentsByMonth[m.key] || 0,
  }));

  // ---- Invoice distribution by effective status ------------------------
  const DISTRIBUTION_ORDER = ["Paid", "Partially Paid", "Unpaid", "Overdue", "Draft"];
  const BUCKET_BY_STATUS = {
    paid: "Paid",
    partial: "Partially Paid",
    unpaid: "Unpaid",
    overdue: "Overdue",
    draft: "Draft",
  };
  const buckets = Object.fromEntries(DISTRIBUTION_ORDER.map((name) => [name, { value: 0, count: 0 }]));
  for (const inv of invoices) {
    const status = statusOf(inv);
    const name = BUCKET_BY_STATUS[status];
    if (!name) continue;
    // Draft shows full invoice value; open invoices show what is still owed; paid owes nothing.
    const value = status === "draft" ? amountOf(inv) : remaining(inv);
    buckets[name].value += value;
    buckets[name].count += 1;
  }
  const invoiceDistribution = DISTRIBUTION_ORDER.map((name) => ({ name, ...buckets[name] })).filter(
    (d) => d.value > 0
  );

  // ---- 30-day cash flow ------------------------------------------------
  // Recorded transactions dated before today form the starting balance.
  // From today onward, each day's inflow is payments dated that day plus open
  // invoices due that day; outflow is paid expenses dated that day plus unpaid
  // expenses due that day. Overdue unpaid items have no day in the forecast.
  const paidOutflowByDay = groupSum(paidExpenses, (e) => expenseDay(e), amountOf);
  const paymentsByDay = groupSum(payments, (p) => dayKey(p.date), amountOf);
  const invoiceDueByDay = groupSum(openInvoices, (i) => dayKey(i.dueDate), remaining);
  const unpaidOutflowByDay = groupSum(unpaidExpenses, (e) => dueDay(e), amountOf);

  let balance =
    opening +
    sum(
      payments.filter((p) => dayKey(p.date) < todayISO),
      amountOf
    ) -
    sum(
      paidExpenses.filter((e) => expenseDay(e) < todayISO),
      amountOf
    );

  const cashFlow30 = Array.from({ length: EXPECTED_WINDOW_DAYS }, (_, i) => {
    const d = addDays(today, i);
    const iso = toISODate(d);
    const inflow = (paymentsByDay[iso] || 0) + (invoiceDueByDay[iso] || 0);
    const outflow = (paidOutflowByDay[iso] || 0) + (unpaidOutflowByDay[iso] || 0);
    balance += inflow - outflow;
    return {
      date: iso,
      label: `${pad(d.getDate())} ${MONTH_LABELS[d.getMonth()]}`,
      inflow: round2(inflow),
      outflow: round2(outflow),
      balance: round2(balance),
    };
  });

  // ---- Smart alerts ----------------------------------------------------
  const alerts = [];
  const addAlert = (alert) => {
    if (alert.count > 0) alerts.push(alert);
  };

  addAlert({
    id: "overdue-payments",
    type: "overdue-payments",
    severity: "danger",
    title: "Overdue customer payments",
    message: `${overdueInvoices.length} invoice(s) past due, ${formatCurrency(overdueAmount, currency)} outstanding.`,
    actionLabel: "View invoices",
    actionTo: "/invoices",
    count: overdueInvoices.length,
  });

  const overdueBills = unpaidExpenses.filter((e) => dueDay(e) < todayISO);
  addAlert({
    id: "bill_overdue",
    type: "bill_overdue",
    severity: "danger",
    title: "Overdue bills",
    message: `${overdueBills.length} unpaid bill(s) past due, ${formatCurrency(
      sum(overdueBills, amountOf),
      currency
    )} outstanding.`,
    actionLabel: "View expenses",
    actionTo: "/expenses",
    count: overdueBills.length,
  });

  const dueSoonBills = unpaidExpenses.filter((e) => inRange(dueDay(e), todayISO, billHorizonISO));
  addAlert({
    id: "bill_due_soon",
    type: "bill_due_soon",
    severity: "warning",
    title: "Bills due soon",
    message: `${dueSoonBills.length} unpaid bill(s) due within ${BILL_ALERT_DAYS} days, ${formatCurrency(
      sum(dueSoonBills, amountOf),
      currency
    )} in total.`,
    actionLabel: "View expenses",
    actionTo: "/expenses",
    count: dueSoonBills.length,
  });

  const dueToday = openInvoices.filter((i) => dayKey(i.dueDate) === todayISO);
  addAlert({
    id: "invoices-due-today",
    type: "invoices-due-today",
    severity: "warning",
    title: "Invoices due today",
    message: `${dueToday.length} invoice(s) fall due today.`,
    actionLabel: "View invoices",
    actionTo: "/invoices",
    count: dueToday.length,
  });

  const lowDays = cashFlow30.filter((d) => d.balance < CASH_FLOOR);
  if (lowDays.length > 0) {
    const lowest = lowDays.reduce((min, d) => (d.balance < min.balance ? d : min), lowDays[0]);
    addAlert({
      id: "cash-shortage",
      type: "cash-shortage",
      severity: lowest.balance < 0 ? "danger" : "warning",
      title: "Possible cash shortage",
      message: `Projected balance drops to ${formatCurrency(lowest.balance, currency)} on ${lowest.label}.`,
      actionLabel: "Open cash flow",
      actionTo: "/cash-flow",
      count: lowDays.length,
    });
  }

  const followUpNames = new Set(overdueInvoices.map((i) => i.customerName).filter(Boolean));
  reminders
    .filter((r) => r.status === "pending" && r.customerName)
    .forEach((r) => followUpNames.add(r.customerName));
  addAlert({
    id: "customers-follow-up",
    type: "customers-follow-up",
    severity: "warning",
    title: "Customers need follow-up",
    message: `${followUpNames.size} customer(s) have overdue invoices or pending reminders.`,
    actionLabel: "View customers",
    actionTo: "/customers",
    count: followUpNames.size,
  });

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  addAlert({
    id: "pending-reminders",
    type: "pending-reminders",
    severity: "info",
    title: "Pending payment reminders",
    message: `${pendingReminders.length} reminder(s) waiting to be sent.`,
    actionLabel: "View reminders",
    actionTo: "/reminders",
    count: pendingReminders.length,
  });

  alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  // ---- Recent transactions --------------------------------------------
  const recentTransactions = [
    ...payments.map((p) => ({
      id: `payment:${p.id}`,
      type: "payment",
      title: p.customerName || "Payment",
      subtitle: p.method ? `${p.method} payment` : "Payment",
      amount: amountOf(p),
      date: dayKey(p.date),
    })),
    ...paidExpenses.map((e) => ({
      id: `expense:${e.id}`,
      type: "expense",
      title: e.name || "Expense",
      subtitle: e.category || "Expense",
      amount: -amountOf(e),
      date: expenseDay(e),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_LIMIT);

  return {
    kpis,
    monthlyIncomeExpense,
    collectionTrend,
    invoiceDistribution,
    cashFlow30,
    alerts,
    recentTransactions,
    hasData: invoices.length > 0 || payments.length > 0 || expenses.length > 0,
  };
}
