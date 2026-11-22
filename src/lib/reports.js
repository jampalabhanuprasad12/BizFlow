import { todayISO, deriveInvoiceStatus, getInvoiceBalance } from "./invoices.js";
import { daysBetween } from "./cashForecast.js";

export const REPORT_RANGE_PRESETS = ["today", "week", "month", "last_month", "custom"];

const DAY_MS = 86400000;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const OPEN_STATUSES = ["unpaid", "partial", "overdue"];
const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function num(n) {
  return Number(n) || 0;
}

function sumBy(arr, fn) {
  return r2(arr.reduce((acc, x) => acc + num(fn(x)), 0));
}

function parseIso(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoOf(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function monthKey(iso) {
  return String(iso || "").slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Yyyy-mm keys for every calendar month overlapping the range.
function monthsIn(range) {
  if (!range?.from || !range?.to) return [];
  const end = parseIso(range.to);
  const start = new Date(parseIso(range.from));
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  const keys = [];
  while (Date.UTC(y, m, 1) <= end) {
    keys.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return keys;
}

// Read-only balance helper: uses getInvoiceBalance when it returns an object or number.
function balanceOf(inv) {
  const b = getInvoiceBalance(inv);
  if (b && typeof b === "object") {
    return { total: num(b.total), paid: num(b.paid), pending: num(b.pending) };
  }
  const total = num(inv.total ?? inv.amount);
  const paid = num(inv.paid);
  return {
    total,
    paid,
    pending: typeof b === "number" ? num(b) : Math.max(0, total - paid),
  };
}

function bucketFor(daysOverdue) {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

export function resolveRange(preset, today = todayISO(), custom = { from: "", to: "" }) {
  if (preset === "custom") {
    let from = custom?.from || "";
    let to = custom?.to || "";
    if (!from || !to) return { from, to, label: "Custom range", valid: false };
    if (from > to) [from, to] = [to, from];
    return { from, to, label: "Custom range", valid: true };
  }

  const t = parseIso(today);

  if (preset === "week") {
    const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
    const from = t - dow * DAY_MS;
    return { from: isoOf(from), to: isoOf(from + 6 * DAY_MS), label: "This week", valid: true };
  }

  if (preset === "month" || preset === "last_month") {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() - (preset === "last_month" ? 1 : 0);
    const from = Date.UTC(y, m, 1);
    const to = Date.UTC(y, m + 1, 0);
    return {
      from: isoOf(from),
      to: isoOf(to),
      label: preset === "month" ? "This month" : "Last month",
      valid: true,
    };
  }

  return { from: today, to: today, label: "Today", valid: true };
}

export function inRange(iso, range) {
  if (!iso) return false;
  return Boolean(range?.from && range?.to) && iso >= range.from && iso <= range.to;
}

export function monthlyRevenueReport(data, range) {
  const invoices = (data.invoices || []).filter(
    (i) => i.status !== "draft" && inRange(i.issueDate, range)
  );
  const payments = (data.payments || []).filter((p) => inRange(p.date, range));

  const rows = monthsIn(range).map((month) => {
    const inv = invoices.filter((i) => monthKey(i.issueDate) === month);
    const pay = payments.filter((p) => monthKey(p.date) === month);
    return {
      month,
      label: monthLabel(month),
      invoiced: sumBy(inv, (i) => balanceOf(i).total),
      collected: sumBy(pay, (p) => p.amount),
      outstanding: sumBy(inv, (i) => balanceOf(i).pending),
    };
  });

  const totals = {
    invoiced: sumBy(rows, (r) => r.invoiced),
    collected: sumBy(rows, (r) => r.collected),
    outstanding: sumBy(rows, (r) => r.outstanding),
  };
  return { rows, totals };
}

export function monthlyExpensesReport(data, range) {
  const expenses = (data.expenses || []).filter((e) => inRange(e.expenseDate, range));

  const rows = monthsIn(range).map((month) => {
    const list = expenses.filter((e) => monthKey(e.expenseDate) === month);
    const paid = sumBy(
      list.filter((e) => e.status === "paid"),
      (e) => e.amount
    );
    const unpaid = sumBy(
      list.filter((e) => e.status !== "paid"),
      (e) => e.amount
    );
    return {
      month,
      label: monthLabel(month),
      paid,
      unpaid,
      total: sumBy(list, (e) => e.amount),
    };
  });

  const totals = {
    paid: sumBy(rows, (r) => r.paid),
    unpaid: sumBy(rows, (r) => r.unpaid),
    total: sumBy(rows, (r) => r.total),
  };

  const grand = sumBy(expenses, (e) => e.amount);
  const catMap = new Map();
  for (const e of expenses) {
    const key = e.category || "Uncategorized";
    catMap.set(key, (catMap.get(key) || 0) + num(e.amount));
  }
  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount: r2(amount),
      share: grand > 0 ? Math.round((amount / grand) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { rows, totals, byCategory };
}

export function profitSummary(data, range) {
  const invoices = (data.invoices || []).filter(
    (i) => i.status !== "draft" && inRange(i.issueDate, range)
  );
  const payments = (data.payments || []).filter((p) => inRange(p.date, range));
  const expenses = (data.expenses || []).filter((e) => inRange(e.expenseDate, range));

  const revenue = sumBy(invoices, (i) => balanceOf(i).total);
  const cashReceived = sumBy(payments, (p) => p.amount);
  const expTotal = sumBy(expenses, (e) => e.amount);
  const paidExp = sumBy(
    expenses.filter((e) => e.status === "paid"),
    (e) => e.amount
  );
  const profit = r2(revenue - expTotal);
  const cashProfit = r2(cashReceived - paidExp);
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  const byMonth = monthsIn(range).map((month) => {
    const rev = sumBy(
      invoices.filter((i) => monthKey(i.issueDate) === month),
      (i) => balanceOf(i).total
    );
    const exp = sumBy(
      expenses.filter((e) => monthKey(e.expenseDate) === month),
      (e) => e.amount
    );
    return { month, label: monthLabel(month), revenue: rev, expenses: exp, profit: r2(rev - exp) };
  });

  return { revenue, cashReceived, expenses: expTotal, profit, cashProfit, margin, byMonth };
}

export function outstandingPaymentsReport(data, range, today) {
  const rows = (data.invoices || [])
    .filter((i) => inRange(i.issueDate, range))
    .map((inv) => ({ inv, b: balanceOf(inv), status: deriveInvoiceStatus(inv, today) }))
    .filter((x) => OPEN_STATUSES.includes(x.status) && x.b.pending > 0)
    .map(({ inv, b, status }) => {
      const daysOverdue = Math.max(0, daysBetween(inv.dueDate, today));
      return {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total: r2(b.total),
        paid: r2(b.paid),
        pending: r2(b.pending),
        daysOverdue,
        status,
        bucket: bucketFor(daysOverdue),
      };
    });

  const totals = {
    total: sumBy(rows, (r) => r.total),
    paid: sumBy(rows, (r) => r.paid),
    pending: sumBy(rows, (r) => r.pending),
  };
  const bucketTotals = Object.fromEntries(
    BUCKETS.map((k) => [k, sumBy(rows.filter((r) => r.bucket === k), (r) => r.pending)])
  );
  return { rows, totals, bucketTotals };
}

export function customerPaymentHistoryReport(data, range, today) {
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  const lower = (s) => String(s || "").trim().toLowerCase();
  const hasId = (v) => v !== null && v !== undefined && v !== "";

  const customers = [];
  const byId = new Map();
  const byName = new Map();

  function rowFor(rec) {
    let row = hasId(rec.customerId) ? byId.get(String(rec.customerId)) : undefined;
    if (!row) row = byName.get(lower(rec.customerName));
    if (!row) {
      row = {
        customerId: hasId(rec.customerId) ? rec.customerId : "",
        customerName: rec.customerName || "",
        invoices: [],
        payments: [],
      };
      customers.push(row);
      byName.set(lower(rec.customerName), row);
    }
    if (hasId(rec.customerId)) byId.set(String(rec.customerId), row);
    return row;
  }

  const invById = new Map();
  const invByNumber = new Map();
  for (const inv of invoices) {
    if (hasId(inv.id)) invById.set(String(inv.id), inv);
    if (inv.invoiceNumber) invByNumber.set(String(inv.invoiceNumber), inv);
    rowFor(inv).invoices.push(inv);
  }
  for (const p of payments) {
    rowFor(p).payments.push(p);
  }

  const findInvoice = (p) =>
    (hasId(p.invoiceId) && invById.get(String(p.invoiceId))) ||
    (p.invoiceNumber && invByNumber.get(String(p.invoiceNumber))) ||
    null;

  const rows = customers
    .map((c) => {
      const invIn = c.invoices.filter((i) => i.status !== "draft" && inRange(i.issueDate, range));
      const payIn = c.payments.filter((p) => inRange(p.date, range));
      const open = c.invoices.filter(
        (i) => OPEN_STATUSES.includes(deriveInvoiceStatus(i, today)) && balanceOf(i).pending > 0
      );
      const delays = payIn
        .map((p) => {
          const inv = findInvoice(p);
          return inv && inv.dueDate && p.date ? Math.max(0, daysBetween(inv.dueDate, p.date)) : null;
        })
        .filter((d) => d !== null);
      const lastPaymentDate = c.payments.reduce(
        (max, p) => (p.date && p.date > max ? p.date : max),
        ""
      );
      return {
        customerId: c.customerId,
        customerName: c.customerName,
        invoiceCount: invIn.length,
        invoiced: sumBy(invIn, (i) => balanceOf(i).total),
        paid: sumBy(payIn, (p) => p.amount),
        outstanding: sumBy(open, (i) => balanceOf(i).pending),
        lastPaymentDate,
        avgDelayDays: delays.length
          ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
          : null,
      };
    })
    .sort((a, b) => b.paid - a.paid);

  return { rows };
}

export function invoiceReport(data, range, today) {
  const rows = (data.invoices || [])
    .filter((i) => inRange(i.issueDate, range))
    .map((inv) => {
      const b = balanceOf(inv);
      return {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total: r2(b.total),
        paid: r2(b.paid),
        pending: r2(b.pending),
        status: deriveInvoiceStatus(inv, today),
        itemCount: Array.isArray(inv.items) ? inv.items.length : num(inv.itemCount),
        taxAmount: r2(inv.taxAmount),
        discountAmount: r2(inv.discountAmount),
      };
    });

  const totals = {
    total: sumBy(rows, (r) => r.total),
    paid: sumBy(rows, (r) => r.paid),
    pending: sumBy(rows, (r) => r.pending),
    taxAmount: sumBy(rows, (r) => r.taxAmount),
    discountAmount: sumBy(rows, (r) => r.discountAmount),
  };

  const countsByStatus = { draft: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0 };
  for (const r of rows) {
    if (Object.prototype.hasOwnProperty.call(countsByStatus, r.status)) countsByStatus[r.status] += 1;
  }
  return { rows, totals, countsByStatus };
}

export function cashFlowReport(data, range, today) {
  const payments = data.payments || [];
  const paidExpenses = (data.expenses || []).filter((e) => e.status === "paid");

  let opening = num(data.settings?.cashOpeningBalance);
  if (range?.from) {
    opening += sumBy(
      payments.filter((p) => p.date && p.date < range.from),
      (p) => p.amount
    );
    opening -= sumBy(
      paidExpenses.filter((e) => e.expenseDate && e.expenseDate < range.from),
      (e) => e.amount
    );
  }
  opening = r2(opening);

  const inflowByDay = new Map();
  const outflowByDay = new Map();
  for (const p of payments) {
    if (!inRange(p.date, range)) continue;
    inflowByDay.set(p.date, (inflowByDay.get(p.date) || 0) + num(p.amount));
  }
  for (const e of paidExpenses) {
    if (!inRange(e.expenseDate, range)) continue;
    outflowByDay.set(e.expenseDate, (outflowByDay.get(e.expenseDate) || 0) + num(e.amount));
  }

  const rows = [];
  let closing = opening;
  if (range?.from && range?.to) {
    const end = parseIso(range.to);
    let cur = parseIso(range.from);
    while (cur <= end && rows.length < 366) {
      const date = isoOf(cur);
      const inflow = r2(inflowByDay.get(date) || 0);
      const outflow = r2(outflowByDay.get(date) || 0);
      const net = r2(inflow - outflow);
      closing = r2(closing + net);
      rows.push({ date, inflow, outflow, net, closing });
      cur += DAY_MS;
    }
  }

  const inflow = sumBy(rows, (r) => r.inflow);
  const outflow = sumBy(rows, (r) => r.outflow);
  const totals = {
    inflow,
    outflow,
    net: r2(inflow - outflow),
    closing: rows.length ? rows[rows.length - 1].closing : opening,
  };

  const monthMap = new Map();
  for (const r of rows) {
    const key = monthKey(r.date);
    if (!monthMap.has(key)) {
      monthMap.set(key, { label: monthLabel(key), inflow: 0, outflow: 0, net: 0 });
    }
    const m = monthMap.get(key);
    m.inflow = r2(m.inflow + r.inflow);
    m.outflow = r2(m.outflow + r.outflow);
    m.net = r2(m.net + r.net);
  }
  const monthly = [...monthMap.values()];

  return { openingBalance: opening, rows, totals, monthly };
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = (rows || []).map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return "\uFEFF" + [header, ...body].join("\r\n");
}

const COLUMNS = {
  monthly_revenue: [
    { key: "month", label: "Month" },
    { key: "label", label: "Label" },
    { key: "invoiced", label: "Invoiced" },
    { key: "collected", label: "Collected" },
    { key: "outstanding", label: "Outstanding" },
  ],
  monthly_expenses: [
    { key: "month", label: "Month" },
    { key: "label", label: "Label" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
    { key: "total", label: "Total" },
  ],
  profit: [
    { key: "month", label: "Month" },
    { key: "label", label: "Label" },
    { key: "revenue", label: "Revenue" },
    { key: "expenses", label: "Expenses" },
    { key: "profit", label: "Profit" },
  ],
  outstanding: [
    { key: "invoiceNumber", label: "Invoice" },
    { key: "customerName", label: "Customer" },
    { key: "issueDate", label: "Issue date" },
    { key: "dueDate", label: "Due date" },
    { key: "total", label: "Total" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
    { key: "daysOverdue", label: "Days overdue" },
    { key: "status", label: "Status" },
    { key: "bucket", label: "Bucket" },
  ],
  customer_history: [
    { key: "customerId", label: "Customer ID" },
    { key: "customerName", label: "Customer" },
    { key: "invoiceCount", label: "Invoices" },
    { key: "invoiced", label: "Invoiced" },
    { key: "paid", label: "Paid" },
    { key: "outstanding", label: "Outstanding" },
    { key: "lastPaymentDate", label: "Last payment" },
    { key: "avgDelayDays", label: "Avg delay (days)" },
  ],
  invoices: [
    { key: "invoiceNumber", label: "Invoice" },
    { key: "customerName", label: "Customer" },
    { key: "issueDate", label: "Issue date" },
    { key: "dueDate", label: "Due date" },
    { key: "total", label: "Total" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
    { key: "status", label: "Status" },
    { key: "itemCount", label: "Items" },
    { key: "taxAmount", label: "Tax" },
    { key: "discountAmount", label: "Discount" },
  ],
  cash_flow: [
    { key: "date", label: "Date" },
    { key: "inflow", label: "Inflow" },
    { key: "outflow", label: "Outflow" },
    { key: "net", label: "Net" },
    { key: "closing", label: "Closing" },
  ],
};

export const REPORT_DEFINITIONS = [
  {
    key: "monthly_revenue",
    title: "Monthly revenue",
    columns: COLUMNS.monthly_revenue,
    build(data, range) {
      const r = monthlyRevenueReport(data, range);
      return { rows: r.rows, totals: r.totals, columns: COLUMNS.monthly_revenue };
    },
  },
  {
    key: "monthly_expenses",
    title: "Monthly expenses",
    columns: COLUMNS.monthly_expenses,
    build(data, range) {
      const r = monthlyExpensesReport(data, range);
      return { rows: r.rows, totals: r.totals, columns: COLUMNS.monthly_expenses };
    },
  },
  {
    key: "profit",
    title: "Profit summary",
    columns: COLUMNS.profit,
    build(data, range) {
      const r = profitSummary(data, range);
      return {
        rows: r.byMonth,
        totals: {
          revenue: r.revenue,
          expenses: r.expenses,
          profit: r.profit,
          cashReceived: r.cashReceived,
          cashProfit: r.cashProfit,
          margin: r.margin,
        },
        columns: COLUMNS.profit,
      };
    },
  },
  {
    key: "outstanding",
    title: "Outstanding payments",
    columns: COLUMNS.outstanding,
    build(data, range, today) {
      const r = outstandingPaymentsReport(data, range, today);
      return { rows: r.rows, totals: r.totals, columns: COLUMNS.outstanding };
    },
  },
  {
    key: "customer_history",
    title: "Customer payment history",
    columns: COLUMNS.customer_history,
    build(data, range, today) {
      const r = customerPaymentHistoryReport(data, range, today);
      const totals = {
        invoiced: sumBy(r.rows, (x) => x.invoiced),
        paid: sumBy(r.rows, (x) => x.paid),
        outstanding: sumBy(r.rows, (x) => x.outstanding),
      };
      return { rows: r.rows, totals, columns: COLUMNS.customer_history };
    },
  },
  {
    key: "invoices",
    title: "Invoice report",
    columns: COLUMNS.invoices,
    build(data, range, today) {
      const r = invoiceReport(data, range, today);
      return { rows: r.rows, totals: r.totals, columns: COLUMNS.invoices };
    },
  },
  {
    key: "cash_flow",
    title: "Cash flow report",
    columns: COLUMNS.cash_flow,
    build(data, range, today) {
      const r = cashFlowReport(data, range, today);
      return { rows: r.rows, totals: r.totals, columns: COLUMNS.cash_flow };
    },
  },
];
