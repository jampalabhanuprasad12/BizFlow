// Cash flow forecast. Pure functions: no React, no storage access, no external calls.
// Dates are ISO "yyyy-mm-dd" strings. Day arithmetic is done in UTC so DST never shifts a day.

import { deriveInvoiceStatus, getInvoiceBalance, todayISO } from "./invoices.js";
import { nextDueDate } from "./expenses.js";
import { formatCurrency } from "./format.js";

const DAY_MS = 86400000;
const DEFAULT_DELAY_DAYS = 7;
const MAX_DELAY_DAYS = 60;
const MAX_RECURRING_STEPS = 24;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const round2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;
const utcMs = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoFromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayLabel = (iso) => `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const bump = (map, key, value) => map.set(key, (map.get(key) || 0) + value);

/** Adds n whole days to a yyyy-mm-dd day (UTC arithmetic). */
export function addDays(isoDate, n) {
  return isoFromMs(utcMs(isoDate) + Math.round(Number(n) || 0) * DAY_MS);
}

/** Whole days from fromIso to toIso (positive when toIso is later), UTC arithmetic. */
export function daysBetween(fromIso, toIso) {
  return Math.round((utcMs(toIso) - utcMs(fromIso)) / DAY_MS);
}

/**
 * Average payment delay, from invoices already paid in full.
 * Delay = latest payment date minus due date (never below 0). Returns { days, source, sampleSize }.
 * With no history: 7 days, source "default".
 */
export function getDelayAssumption(invoices = [], payments = []) {
  const now = todayISO();
  const delays = [];
  for (const invoice of invoices || []) {
    if (!invoice || !invoice.dueDate) continue;
    if (deriveInvoiceStatus(invoice, now) !== "paid") continue;
    const dates = (payments || [])
      .filter((p) => p && p.invoiceId && String(p.invoiceId) === String(invoice.id) && p.date)
      .map((p) => String(p.date).slice(0, 10));
    if (dates.length === 0) continue;
    const latest = dates.reduce((a, b) => (b > a ? b : a));
    delays.push(Math.max(0, daysBetween(invoice.dueDate, latest)));
  }
  if (delays.length === 0) return { days: DEFAULT_DELAY_DAYS, source: "default", sampleSize: 0 };
  const mean = delays.reduce((sum, d) => sum + d, 0) / delays.length;
  const days = Math.min(MAX_DELAY_DAYS, Math.max(0, Math.round(mean)));
  return { days, source: "history", sampleSize: delays.length };
}

/** Just the average payment delay in days (see getDelayAssumption). */
export function computeAverageDelayDays(invoices = [], payments = []) {
  return getDelayAssumption(invoices, payments).days;
}

/**
 * Builds the cash flow forecast for the next `horizonDays` days (30, 60 or 90 are typical).
 * Returns { horizonDays, today, endDate, summary, transactions, daily, weekly, assumptions }.
 */
export function computeCashForecast(data, { today = todayISO(), horizonDays = 30 } = {}) {
  const src = data || {};
  const start = todayISO(today);
  const horizon = Math.max(1, Math.round(Number(horizonDays)) || 30);
  const endDate = addDays(start, horizon - 1);
  const invoices = src.invoices || [];
  const payments = src.payments || [];
  const expenses = src.expenses || [];

  // Current cash = opening balance + all recorded payments − all expenses already marked paid.
  // These are NOT future flows.
  const openingCash = Number(src.settings?.cashOpeningBalance) || 0;
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidExpensesTotal = expenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const currentCash = round2(openingCash + paymentsTotal - paidExpensesTotal);
  const startCash = currentCash;

  const delay = getDelayAssumption(invoices, payments);

  // Every candidate item, keyed by id so nothing is counted twice.
  const items = new Map();
  const addItem = (item) => {
    if (!items.has(item.id)) items.set(item.id, item);
  };

  // INCOMING: open invoices only (not draft, not paid, with money still pending).
  for (const invoice of invoices) {
    if (!invoice) continue;
    const status = deriveInvoiceStatus(invoice, start);
    if (status === "draft" || status === "paid") continue;
    const pending = getInvoiceBalance(invoice).pending;
    if (!(pending > 0)) continue;

    const dueDate = invoice.dueDate || "";
    const overdue = dueDate !== "" && dueDate < start;
    const date = dueDate && !overdue ? dueDate : addDays(start, delay.days);

    addItem({
      id: "IN-" + invoice.id,
      date,
      type: "in",
      source: "invoice",
      description: `Invoice ${invoice.invoiceNumber} · ${invoice.customerName}`,
      amount: round2(pending),
      estimated: true,
      status,
      overdue,
    });
  }

  // OUTGOING a: unpaid expenses due within the horizon (overdue ones count as due today).
  for (const expense of expenses) {
    if (!expense || expense.status === "paid") continue;
    const dueDate = expense.dueDate;
    if (!dueDate || dueDate > endDate) continue;
    const overdue = dueDate < start;
    addItem({
      id: "OUT-" + expense.id,
      date: overdue ? start : dueDate,
      type: "out",
      source: "bill",
      description: `${expense.name} · ${expense.category}`,
      amount: round2(expense.amount),
      estimated: false,
      overdue,
    });
  }

  // OUTGOING b: recurring bills projected forward from their latest recorded instance.
  const series = new Map();
  for (const expense of expenses) {
    if (!expense) continue;
    const frequency = expense.recurring?.frequency;
    if (!frequency || frequency === "none" || !expense.dueDate) continue;
    const key = expense.recurring?.parentId || expense.id;
    if (!series.has(key)) series.set(key, []);
    series.get(key).push(expense);
  }
  for (const [key, group] of series) {
    const latest = group.reduce((a, b) => (b.dueDate > a.dueDate ? b : a));
    const frequency = latest.recurring.frequency;
    let cursor = latest.dueDate;
    for (let step = 0; step < MAX_RECURRING_STEPS; step++) {
      const next = nextDueDate(cursor, frequency);
      if (!next || next > endDate) break;
      if (next >= start) {
        const exists = expenses.some(
          (e) => e && (e.recurring?.parentId || e.id) === key && e.dueDate === next
        );
        if (!exists) {
          addItem({
            id: `REC-${key}-${next}`,
            date: next,
            type: "out",
            source: "recurring",
            description: `${latest.name} (recurring)`,
            amount: round2(latest.amount),
            estimated: true,
            overdue: false,
          });
        }
      }
      cursor = next;
    }
  }

  // Split by horizon. Incoming after the horizon is reported as laterIncoming.
  const allItems = [...items.values()];
  const inHorizon = allItems.filter((i) => i.date >= start && i.date <= endDate);
  const incoming = inHorizon.filter((i) => i.type === "in");
  const outgoing = inHorizon.filter((i) => i.type === "out");
  const laterIncoming = round2(
    allItems
      .filter((i) => i.type === "in" && i.date > endDate)
      .reduce((sum, i) => sum + i.amount, 0)
  );

  const transactions = [...inHorizon]
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type))
    .map(({ id, date, type, description, amount, estimated, source, overdue }) => ({
      id,
      date,
      type,
      description,
      amount,
      estimated,
      source,
      overdue,
    }));

  // Per-day flows, then running balance.
  const inflowBy = new Map();
  const estimatedBy = new Map();
  const outflowBy = new Map();
  for (const item of inHorizon) {
    if (item.type === "in") {
      bump(inflowBy, item.date, item.amount);
      if (item.estimated) bump(estimatedBy, item.date, item.amount);
    } else {
      bump(outflowBy, item.date, item.amount);
    }
  }

  const daily = [];
  let cumulativeNet = 0;
  for (let i = 0; i < horizon; i++) {
    const date = addDays(start, i);
    const inflow = round2(inflowBy.get(date));
    const outflow = round2(outflowBy.get(date));
    const estimatedInflow = round2(estimatedBy.get(date));
    const net = round2(inflow - outflow);
    cumulativeNet = round2(cumulativeNet + net);
    daily.push({
      date,
      label: dayLabel(date),
      inflow,
      outflow,
      estimatedInflow,
      net,
      balance: round2(startCash + cumulativeNet),
    });
  }

  // Weekly buckets of 7 days from today; the last one may be shorter.
  const weekly = [];
  for (let from = 0, index = 1; from < daily.length; from += 7, index++) {
    const slice = daily.slice(from, from + 7);
    const last = slice[slice.length - 1];
    const inflow = round2(slice.reduce((sum, d) => sum + d.inflow, 0));
    const outflow = round2(slice.reduce((sum, d) => sum + d.outflow, 0));
    weekly.push({
      index,
      label: `Week ${index}`,
      start: slice[0].date,
      end: last.date,
      inflow,
      outflow,
      net: round2(inflow - outflow),
      closing: last.balance,
      estimatedInflow: round2(slice.reduce((sum, d) => sum + d.estimatedInflow, 0)),
    });
  }

  // Contiguous runs of days with a negative balance.
  const shortageDates = [];
  for (const day of daily) {
    if (day.balance >= 0) continue;
    const last = shortageDates[shortageDates.length - 1];
    if (last && addDays(last.to, 1) === day.date) {
      last.to = day.date;
      last.lowestBalance = Math.min(last.lowestBalance, day.balance);
    } else {
      shortageDates.push({ from: day.date, to: day.date, lowestBalance: day.balance });
    }
  }

  const lowest = daily.length
    ? daily.reduce((m, d) => (d.balance < m.balance ? d : m), daily[0])
    : null;
  const expectedIncoming = round2(incoming.reduce((sum, i) => sum + i.amount, 0));
  const expectedOutgoing = round2(outgoing.reduce((sum, i) => sum + i.amount, 0));
  const estimatedInflow = round2(
    incoming.filter((i) => i.estimated).reduce((sum, i) => sum + i.amount, 0)
  );

  const summary = {
    currentCash,
    expectedIncoming,
    expectedOutgoing,
    projectedClosing: daily.length ? daily[daily.length - 1].balance : startCash,
    lowestBalance: lowest ? lowest.balance : startCash,
    lowestDate: lowest ? lowest.date : start,
    shortageDates,
    hasShortage: daily.some((d) => d.balance < 0),
    laterIncoming,
    estimatedShare: expectedIncoming > 0 ? Math.round((estimatedInflow / expectedIncoming) * 10000) / 10000 : 0,
    delayDays: delay.days,
    delaySource: delay.source,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
  };

  const delayBasis =
    delay.source === "history"
      ? `${delay.sampleSize} paid invoice${delay.sampleSize === 1 ? "" : "s"} of payment history`
      : `the default ${DEFAULT_DELAY_DAYS}-day assumption (no payment history yet)`;

  const assumptions = [
    `Opening cash = ${formatCurrency(startCash)} (settings opening balance + recorded payments − paid expenses).`,
    `Invoices are expected on their due date. Overdue invoices are expected ${delay.days} days from today, based on your average payment delay (${delayBasis}).`,
    "Unpaid bills are paid on their due date; overdue bills are treated as due today.",
    "Recurring bills are projected from their last recorded instance.",
    "Paid invoices and paid expenses are not counted as future cash.",
  ];

  return {
    horizonDays: horizon,
    today: start,
    endDate,
    summary,
    transactions,
    daily,
    weekly,
    assumptions,
  };
}
