// Pure expense and bill helpers. No React, no storage access.
// Dates are ISO "yyyy-mm-dd" strings (local calendar days). Day arithmetic is done in UTC.

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Electricity",
  "Water",
  "Products and Supplies",
  "Equipment",
  "Marketing",
  "Maintenance",
  "Other",
];

export const PAYMENT_METHODS_EXPENSE = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

export const RECURRING_FREQUENCIES = {
  none: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const EXPENSE_STATUSES = ["paid", "unpaid"];
const STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const MAX_AMOUNT = 10000000;
const NAME_MIN = 2;
const NAME_MAX = 80;
const NOTES_MAX = 500;
const DUE_SOON_DAYS = 7;
const UPCOMING_DAYS = 30;
const DAY_MS = 86400000;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n) => String(n).padStart(2, "0");
const round2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON) / 100;
const text = (v) => (v === undefined || v === null ? "" : String(v));
const isFrequency = (v) => typeof v === "string" && Object.keys(RECURRING_FREQUENCIES).includes(v);

// True only for a real calendar day in "yyyy-mm-dd" form.
export function isISODay(value) {
  if (typeof value !== "string" || !ISO_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

const localISO = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// Accepts "yyyy-mm-dd" (or an ISO timestamp), a Date, or a parseable string. Returns "yyyy-mm-dd" or fallback.
function toDay(value, fallback) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) && isISODay(value.slice(0, 10))) {
    return value.slice(0, 10);
  }
  if (value instanceof Date || (typeof value === "string" && value.trim() !== "")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return localISO(d);
  }
  return fallback;
}

const todayOf = (today) => toDay(today, localISO(new Date()));

const utcMs = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// Whole days from `from` to `to`; positive when `to` is later.
function daysBetween(from, to) {
  return Math.round((utcMs(to) - utcMs(from)) / DAY_MS);
}

// Adds months to a yyyy-mm-dd day, clamping the day to the last day of the target month.
function addMonths(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const index = m - 1 + months;
  const year = y + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad2(month + 1)}-${pad2(Math.min(d, lastDay))}`;
}

/**
 * Converts a raw (possibly legacy) expense into the full normalised shape.
 * Legacy fields: description -> name, date -> expenseDate, paid === false -> status "unpaid".
 */
export function normalizeExpense(raw = {}, today) {
  const src = raw && typeof raw === "object" ? raw : {};
  const todayDay = todayOf(today);

  const expenseDate = toDay(src.expenseDate ?? src.date, todayDay);
  const dueDate = toDay(src.dueDate, expenseDate);
  const status = EXPENSE_STATUSES.includes(src.status) ? src.status : src.paid === false ? "unpaid" : "paid";
  const category = EXPENSE_CATEGORIES.includes(src.category) ? src.category : "Other";
  const amountNum = Number(src.amount);
  const amount = Number.isFinite(amountNum) && amountNum >= 0 ? round2(amountNum) : 0;
  const frequencyInput = src.recurring?.frequency ?? src.frequency;
  const frequency = isFrequency(frequencyInput) ? frequencyInput : "none";

  return {
    id: text(src.id),
    name: text(src.name ?? src.description).trim(),
    category,
    amount,
    expenseDate,
    dueDate,
    status,
    paidDate: status === "paid" ? toDay(src.paidDate, expenseDate) : null,
    paymentMethod: text(src.paymentMethod).trim() || "Cash",
    notes: text(src.notes).trim().slice(0, NOTES_MAX),
    recurring: {
      frequency,
      parentId: src.recurring?.parentId ? String(src.recurring.parentId) : null,
    },
    createdFrom: src.createdFrom || null,
  };
}

/**
 * Validates form values (raw, not normalised). Returns { valid, errors, normalized }.
 * Errors are keyed by field; only fields that fail are present.
 */
export function validateExpense(values = {}, today) {
  const src = values && typeof values === "object" ? values : {};
  const normalized = normalizeExpense(src, today);
  const errors = {};

  const name = text(src.name ?? src.description).trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = `Name must be ${NAME_MIN}–${NAME_MAX} characters.`;
  }

  if (!EXPENSE_CATEGORIES.includes(src.category)) {
    errors.category = "Choose a valid category.";
  }

  const rawAmount = src.amount;
  const amount = rawAmount === "" || rawAmount === null || rawAmount === undefined ? NaN : Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    errors.amount = "Amount must be more than 0 and no more than 10,000,000.";
  }

  const expenseDate = isISODay(src.expenseDate) ? src.expenseDate : "";
  if (!expenseDate) errors.expenseDate = "Enter a valid expense date.";

  const dueDate = isISODay(src.dueDate) ? src.dueDate : "";
  if (!dueDate) {
    errors.dueDate = "Enter a valid due date.";
  } else if (expenseDate && dueDate < expenseDate) {
    errors.dueDate = "Due date cannot be before the expense date.";
  }

  if (src.status !== undefined && !EXPENSE_STATUSES.includes(src.status)) {
    errors.status = "Status must be paid or unpaid.";
  }

  if (normalized.status === "paid" && !PAYMENT_METHODS_EXPENSE.includes(src.paymentMethod)) {
    errors.paymentMethod = "Choose a payment method for a paid expense.";
  }

  const frequencyInput = src.recurring?.frequency ?? src.frequency ?? "none";
  if (!isFrequency(frequencyInput)) {
    errors.frequency = "Choose a valid repeat option.";
  }

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}

/** Whole days from today to the due date. Negative means overdue. */
export function getExpenseDaysRemaining(expense, today) {
  const todayDay = todayOf(today);
  const due = toDay(expense?.dueDate, todayDay);
  return daysBetween(todayDay, due);
}

/**
 * Bill status: "paid", "overdue" (unpaid, due before today), "due_soon" (unpaid, due in 0–7 days),
 * or "upcoming" (unpaid, due later).
 */
export function getBillStatus(expense, today) {
  if (expense?.status === "paid") return "paid";
  const days = getExpenseDaysRemaining(expense, today);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "upcoming";
}

/** Returns the expense marked paid. paidDate defaults to today. */
export function markExpensePaid(expense, { paidDate, paymentMethod } = {}, today) {
  return normalizeExpense(
    {
      ...expense,
      status: "paid",
      paidDate: paidDate || todayOf(today),
      paymentMethod: paymentMethod || expense?.paymentMethod || "Cash",
    },
    today
  );
}

/** Returns the expense marked unpaid, with paidDate cleared. */
export function markExpenseUnpaid(expense, today) {
  return normalizeExpense({ ...expense, status: "unpaid", paidDate: null }, today);
}

/** Next due date one month, quarter or year later (day clamped to month end). null for one-time. */
export function nextDueDate(dueDate, frequency) {
  const months = STEP_MONTHS[frequency];
  if (typeof months !== "number") return null;
  if (!isISODay(dueDate)) return null;
  return addMonths(dueDate, months);
}

/**
 * Builds the next unpaid instance of a recurring expense. Returns null when not recurring.
 * id is left undefined so the store assigns one.
 */
export function makeNextRecurringInstance(expense, today) {
  const frequency = expense?.recurring?.frequency;
  const nextDue = nextDueDate(expense?.dueDate, frequency);
  if (!nextDue) return null;
  const nextExpenseDate = nextDueDate(expense.expenseDate, frequency) ?? nextDue;
  const instance = normalizeExpense(
    {
      ...expense,
      id: undefined,
      status: "unpaid",
      paidDate: null,
      expenseDate: nextExpenseDate,
      dueDate: nextDue,
      recurring: {
        frequency,
        parentId: expense.recurring?.parentId || expense.id,
      },
    },
    today
  );
  return { ...instance, id: undefined };
}

/**
 * Filters by text, category, status and expense-date range; sorted by expenseDate, newest first.
 * status: "all" | "paid" | "unpaid" | "overdue" | "due_soon".
 */
export function filterExpenses(
  expenses = [],
  { query = "", category = "all", status = "all", dateFrom = "", dateTo = "" } = {},
  today
) {
  const needle = text(query).trim().toLowerCase();
  return (expenses || [])
    .filter((expense) => {
      if (needle) {
        const inText =
          text(expense.name).toLowerCase().includes(needle) ||
          text(expense.category).toLowerCase().includes(needle) ||
          text(expense.notes).toLowerCase().includes(needle);
        if (!inText) return false;
      }
      if (category && category !== "all" && expense.category !== category) return false;
      if (status && status !== "all") {
        if (status === "paid" || status === "unpaid") {
          if (expense.status !== status) return false;
        } else if (getBillStatus(expense, today) !== status) {
          return false;
        }
      }
      if (dateFrom && expense.expenseDate < dateFrom) return false;
      if (dateTo && expense.expenseDate > dateTo) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.expenseDate === b.expenseDate) return 0;
      return a.expenseDate < b.expenseDate ? 1 : -1;
    });
}

/**
 * Totals for the expense dashboard.
 * totalThisMonth and byCategory use expenseDate in the current month.
 * The bill totals (paid/unpaid/overdue/due soon/upcoming) cover all expenses, by status and due date.
 * largestCategory is { category, amount } for this month, or null.
 */
export function computeExpenseTotals(expenses = [], today) {
  const todayDay = todayOf(today);
  const monthPrefix = todayDay.slice(0, 7);
  const list = expenses || [];

  const thisMonth = list.filter((e) => String(e.expenseDate).slice(0, 7) === monthPrefix);
  const totalThisMonth = round2(thisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

  const sumOf = (items) => round2(items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
  const paid = list.filter((e) => e.status === "paid");
  const unpaid = list.filter((e) => e.status !== "paid");
  const statusOf = (e) => getBillStatus(e, todayDay);
  const overdue = unpaid.filter((e) => statusOf(e) === "overdue");
  const dueSoon = unpaid.filter((e) => statusOf(e) === "due_soon");
  const upcoming = unpaid.filter((e) => {
    const days = getExpenseDaysRemaining(e, todayDay);
    return days >= 0 && days <= UPCOMING_DAYS;
  });

  const categoryTotals = {};
  for (const e of thisMonth) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
  }
  const byCategory = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalThisMonth,
    paidTotal: sumOf(paid),
    unpaidTotal: sumOf(unpaid),
    overdueTotal: sumOf(overdue),
    dueSoonTotal: sumOf(dueSoon),
    upcomingTotal: sumOf(upcoming),
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    byCategory,
    largestCategory: byCategory[0] ?? null,
  };
}

/** All expenses with the same name (case-insensitive), sorted by expenseDate, newest first. */
export function expenseHistoryForName(expenses = [], name) {
  const key = text(name).trim().toLowerCase();
  return (expenses || [])
    .filter((e) => text(e.name).trim().toLowerCase() === key)
    .sort((a, b) => {
      if (a.expenseDate === b.expenseDate) return 0;
      return a.expenseDate < b.expenseDate ? 1 : -1;
    });
}
