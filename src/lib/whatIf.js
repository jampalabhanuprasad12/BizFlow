// What-if scenario simulator for the cash flow forecast. Pure functions: no React.
// Simulations never mutate their input: they build new arrays and objects.

import { computeCashForecast, getDelayAssumption, addDays } from "./cashForecast.js";
import { deriveInvoiceStatus, getInvoiceBalance, todayISO } from "./invoices.js";
import { formatCurrency, formatDate } from "./format.js";

export const SCENARIO_PRESETS = [7, 15, 30];

const MAX_DELAY = 180;
const DELAY_ERROR = "Enter a whole number of days between 0 and 180.";
const OPEN_STATUSES = ["unpaid", "partial", "overdue"];

const round2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;

// "yyyy-mm-dd" as a local Date, so formatDate shows the same calendar day.
const localDate = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDay = (iso) => (iso ? formatDate(localDate(iso)) : "");

/** Checks a delay in days: a number or numeric string, whole number from 0 to 180. */
export function validateDelay(value) {
  let n = NaN;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) {
    n = Number(value.trim());
  }
  const valid = Number.isInteger(n) && n >= 0 && n <= MAX_DELAY;
  return { valid, days: valid ? n : null, error: valid ? null : DELAY_ERROR };
}

/** Expected payment date: the due date if it is still ahead, otherwise today plus the average delay. */
export function getInvoiceExpectedDate(invoice, today, avgDelay) {
  const dueDate = invoice?.dueDate || "";
  if (dueDate && dueDate >= today) return dueDate;
  return addDays(today, avgDelay);
}

/** Open invoices (unpaid, partial or overdue) with money still pending, largest balance first. */
export function listUnpaidInvoices(data, today = todayISO()) {
  const src = data || {};
  const invoices = src.invoices || [];
  const avgDelay = getDelayAssumption(invoices, src.payments || []).days;
  const rows = [];
  for (const invoice of invoices) {
    if (!invoice) continue;
    if (!OPEN_STATUSES.includes(deriveInvoiceStatus(invoice, today))) continue;
    const pending = getInvoiceBalance(invoice).pending;
    if (!(pending > 0)) continue;
    rows.push({
      invoice,
      pending,
      expectedDate: getInvoiceExpectedDate(invoice, today, avgDelay),
      customerName: invoice.customerName ?? "",
    });
  }
  return rows.sort((a, b) => b.pending - a.pending);
}

/**
 * Simulates one invoice being paid `delayDays` late, compared with the normal forecast.
 * Returns { ok:false, error } or { ok:true, ...figures, series }.
 */
export function runDelayScenario(
  data,
  { invoiceId, delayDays, horizonDays = 90, today = todayISO() } = {}
) {
  const src = data || {};
  const invoices = src.invoices || [];
  const payments = src.payments || [];

  const invoice = invoices.find((i) => i && String(i.id) === String(invoiceId));
  if (!invoice) return { ok: false, error: "Invoice not found." };

  const status = deriveInvoiceStatus(invoice, today);
  const pending = getInvoiceBalance(invoice).pending;
  if (!OPEN_STATUSES.includes(status) || !(pending > 0)) {
    return { ok: false, error: "Only unpaid, partly paid or overdue invoices can be simulated." };
  }

  const check = validateDelay(delayDays);
  if (!check.valid) return { ok: false, error: check.error };

  const avgDelay = getDelayAssumption(invoices, payments).days;
  const originalDate = getInvoiceExpectedDate(invoice, today, avgDelay);
  const simulatedDate = addDays(originalDate, check.days);

  // Copy only: the original data object is never changed.
  const scenarioData = {
    ...src,
    invoices: invoices.map((i) =>
      i && String(i.id) === String(invoiceId) ? { ...i, dueDate: simulatedDate } : i
    ),
  };

  const baseline = computeCashForecast(src, { today, horizonDays });
  const scenario = computeCashForecast(scenarioData, { today, horizonDays });

  const originalBalance = round2(baseline.summary.projectedClosing);
  const newBalance = round2(scenario.summary.projectedClosing);
  const firstShortage = scenario.summary.shortageDates[0];

  return {
    ok: true,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName ?? "",
      pending: round2(pending),
    },
    delayDays: check.days,
    originalDate,
    simulatedDate,
    leavesHorizon: simulatedDate > scenario.endDate,
    originalBalance,
    newBalance,
    difference: round2(newBalance - originalBalance),
    lowestOriginal: round2(baseline.summary.lowestBalance),
    lowestNew: round2(scenario.summary.lowestBalance),
    shortageCreated: scenario.summary.hasShortage && !baseline.summary.hasShortage,
    hasShortage: scenario.summary.hasShortage,
    shortageDate: firstShortage?.from ?? null,
    shortageEnd: firstShortage?.to ?? null,
    series: baseline.daily.map((d, idx) => ({
      date: d.date,
      label: d.label,
      normal: d.balance,
      delayed: scenario.daily[idx]?.balance ?? d.balance,
    })),
    horizonDays,
    endDate: scenario.endDate,
  };
}

/** One plain-English sentence describing a scenario result. */
export function describeScenario(result) {
  if (!result || !result.ok) return result?.error ?? "";

  const { invoice, delayDays, difference, endDate, shortageCreated, shortageDate, shortageEnd, leavesHorizon } =
    result;

  if (difference === 0 && !shortageCreated) {
    return "This delay does not change the projected balance within the forecast period.";
  }

  const days = `${delayDays} day${delayDays === 1 ? "" : "s"}`;
  const head = `If ${invoice.invoiceNumber} (${invoice.customerName}) pays ${days} late, `;
  const balance =
    difference < 0
      ? `the balance on ${fmtDay(endDate)} falls by ${formatCurrency(-difference)}`
      : difference > 0
        ? `the balance on ${fmtDay(endDate)} rises by ${formatCurrency(difference)}`
        : `the balance on ${fmtDay(endDate)} stays the same`;

  let sentence = head + balance;
  if (shortageCreated && shortageDate) {
    sentence += ` and cash runs short from ${fmtDay(shortageDate)}`;
    if (shortageEnd && shortageEnd !== shortageDate) sentence += ` to ${fmtDay(shortageEnd)}`;
  }
  if (leavesHorizon) sentence += ". The payment then falls after the forecast period";
  return sentence + ".";
}
