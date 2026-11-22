import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { normalizeDate } from "../lib/dashboardMetrics.js";
import { generateCustomerId } from "../lib/customers.js";
import { generateInvoiceNumber, normalizeInvoice, todayISO } from "../lib/invoices.js";
import { validatePayment } from "../lib/payments.js";
import { normalizeExpense, markExpensePaid, markExpenseUnpaid, makeNextRecurringInstance } from "../lib/expenses.js";
import {
  customers as seedCustomers,
  invoices as seedInvoices,
  payments as seedPayments,
  reminders as seedReminders,
  expenses as seedExpenses,
} from "../data/sampleData.js";

export const STORAGE_KEY = "bizflow:data:v1";
export const CORRUPT_BACKUP_KEY = "bizflow:data:corrupt-backup";
export const STORAGE_ERROR_MESSAGE = "Could not save changes. Your browser storage may be full.";

export const DEFAULT_SETTINGS = {
  businessName: "Bella Beauty Studio",
  businessAddress: "Shop 12, Linking Road, Bandra West, Mumbai 400050",
  businessPhone: "+91 98200 12345",
  businessEmail: "hello@bellabeauty.example",
  gstin: "",
  currency: "INR",
  vatRate: 18,
  invoicePrefix: "INV-",
  paymentInstructions:
    "Pay by UPI, card, bank transfer or cash. Please quote the invoice number as the payment reference.",
  cashOpeningBalance: 4200,
  paymentTermsDays: 14,
  ownerName: "Sofia Alvarez",
  logoDataUrl: "",
};

const COLLECTIONS = ["customers", "invoices", "payments", "expenses", "reminders", "followUps"];

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const text = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const idOr = (value, prefix) =>
  value === undefined || value === null || String(value).trim() === "" ? makeId(prefix) : String(value);
const list = (v) => (Array.isArray(v) ? v : []);

// ---- Record normalisers: every record gets a stable string id and typed fields.

const normalizeCustomer = (c = {}) => ({
  ...c,
  id: idOr(c.id, "CUS"),
  name: text(c.name),
  email: text(c.email),
  phone: text(c.phone),
  status: text(c.status) || "pending",
});

// Invoice rules (derived status, balances, numbering) live in lib/invoices.js.
const normalizeInvoiceRecord = (inv = {}) => normalizeInvoice(inv, todayISO());

const normalizePayment = (p = {}) => ({
  ...p,
  id: idOr(p.id, "PAY"),
  invoiceId: p.invoiceId ? String(p.invoiceId) : null,
  customerName: text(p.customerName),
  amount: num(p.amount),
  method: text(p.method) || "Other",
  date: normalizeDate(p.date),
  status: "paid",
});

// Expense rules (status, categories, recurrence) live in lib/expenses.js.
const normalizeExpenseRecord = (e = {}) => normalizeExpense({ ...e, id: idOr(e.id, "EXP") }, todayISO());

const normalizeReminder = (r = {}) => ({ ...r, id: idOr(r.id, "REM") });

const normalizeFollowUp = (f = {}) => ({
  ...f,
  id: idOr(f.id, "FU"),
  invoiceId: f.invoiceId ? String(f.invoiceId) : null,
  type: text(f.type) || "reminder",
  channel: text(f.channel) || null,
  note: text(f.note),
  date: normalizeDate(f.date),
  scheduledFor: text(f.scheduledFor) ? normalizeDate(f.scheduledFor) : null,
  createdAt: text(f.createdAt) || new Date().toISOString(),
});

const NORMALIZERS = {
  customers: normalizeCustomer,
  invoices: normalizeInvoiceRecord,
  payments: normalizePayment,
  expenses: normalizeExpenseRecord,
  reminders: normalizeReminder,
  followUps: normalizeFollowUp,
};

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const MAX_LOGO_LENGTH = 300000;

const normalizeSettings = (s) => {
  const merged = { ...DEFAULT_SETTINGS, ...(s && typeof s === "object" && !Array.isArray(s) ? s : {}) };
  const terms = isBlank(merged.paymentTermsDays) ? NaN : Number(merged.paymentTermsDays);
  const opening = isBlank(merged.cashOpeningBalance) ? NaN : Number(merged.cashOpeningBalance);
  const logo = typeof merged.logoDataUrl === "string" ? merged.logoDataUrl : "";
  return {
    ...merged,
    vatRate: num(merged.vatRate),
    paymentTermsDays: Number.isFinite(terms) ? Math.min(365, Math.max(0, Math.round(terms))) : 14,
    ownerName: text(merged.ownerName).trim().slice(0, 80),
    logoDataUrl: logo.startsWith("data:image/") && logo.length <= MAX_LOGO_LENGTH ? logo : "",
    currency: "INR",
    cashOpeningBalance: Number.isFinite(opening) && opening >= 0 ? opening : 4200,
  };
};

function normalizeData(raw = {}) {
  return {
    customers: list(raw.customers).map(normalizeCustomer),
    invoices: list(raw.invoices).map((inv) => normalizeInvoiceRecord(inv)),
    payments: list(raw.payments).map(normalizePayment),
    expenses: list(raw.expenses).map(normalizeExpenseRecord),
    reminders: list(raw.reminders).map(normalizeReminder),
    followUps: list(raw.followUps).map(normalizeFollowUp),
    settings: normalizeSettings(raw.settings),
  };
}

// Seeded customers without an id get a stable "CUST-" + padded index.
const seedCustomerRecords = () =>
  seedCustomers.map((c, idx) => (c.id ? c : { ...c, id: `CUST-${String(idx + 1).padStart(4, "0")}` }));

// Links seeded invoices/payments to a seeded customer by name (case-insensitive).
const linkSeedToCustomer = (customers) => (record) => {
  const key = text(record.customerName).trim().toLowerCase();
  const match = key ? customers.find((c) => text(c.name).trim().toLowerCase() === key) : null;
  return match ? { ...record, customerId: match.id } : record;
};

const buildSeed = () => {
  const customers = seedCustomerRecords();
  const link = linkSeedToCustomer(customers);
  return normalizeData({
    customers,
    invoices: seedInvoices.map(link),
    payments: seedPayments.map(link),
    expenses: seedExpenses,
    reminders: seedReminders,
    followUps: [],
    settings: DEFAULT_SETTINGS,
  });
};

const readRawStorage = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

// Never throws. Corrupted stored data is copied to CORRUPT_BACKUP_KEY before falling back to the seed.
function loadInitialData() {
  const raw = readRawStorage();
  if (raw === null) return { data: buildSeed(), recoveredFromCorruption: false };
  const recover = () => {
    try {
      window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // Backup is best-effort; recovery still proceeds.
    }
    return { data: buildSeed(), recoveredFromCorruption: true };
  };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return recover();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return recover();
  try {
    return { data: normalizeData(parsed), recoveredFromCorruption: false };
  } catch {
    return recover();
  }
}

// ---- Reducer -----------------------------------------------------------------

function dataReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const normalize = NORMALIZERS[action.collection];
      if (!normalize) return state;
      let record = action.record;
      if (action.collection === "customers" && text(record?.id).trim() === "") {
        record = { ...record, id: generateCustomerId(state.customers) };
      }
      if (action.collection === "invoices" && text(record?.id).trim() === "") {
        record = {
          ...record,
          id: record?.invoiceNumber || generateInvoiceNumber(state.invoices, state.settings.invoicePrefix),
        };
      }
      return { ...state, [action.collection]: [...state[action.collection], normalize(record)] };
    }
    case "UPDATE": {
      const normalize = NORMALIZERS[action.collection];
      if (!normalize) return state;
      const target = state[action.collection].find((r) => r.id === String(action.id));
      if (!target) return state;
      const next = normalize({ ...target, ...action.patch, id: target.id });
      return {
        ...state,
        [action.collection]: state[action.collection].map((r) => (r.id === target.id ? next : r)),
      };
    }
    case "DELETE": {
      if (!COLLECTIONS.includes(action.collection)) return state;
      const removedId = String(action.id);
      const next = {
        ...state,
        [action.collection]: state[action.collection].filter((r) => r.id !== removedId),
      };
      if (action.collection === "invoices") {
        // Keep payment history; only detach it from the deleted invoice.
        next.payments = state.payments.map((p) =>
          p.invoiceId === removedId ? { ...p, invoiceId: undefined } : p
        );
        next.followUps = state.followUps.filter((f) => f.invoiceId !== removedId);
      }
      return next;
    }
    case "SET_DATA":
      return action.data;
    case "REPLACE":
      return action.data;
    case "RESET":
      return buildSeed();
    default:
      return state;
  }
}

// ---- Context -----------------------------------------------------------------

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [boot] = useState(loadInitialData);
  const [data, dispatch] = useReducer(dataReducer, boot.data);
  const [recoveredFromCorruption] = useState(boot.recoveredFromCorruption);
  const [storageError, setStorageError] = useState("");
  // Mirrors the latest state so recordPayment can compute and return its result synchronously.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError(STORAGE_ERROR_MESSAGE);
    }
  }, [data]);

  const addRecord = useCallback((collection, record) => {
    dispatch({ type: "ADD", collection, record });
  }, []);

  const updateRecord = useCallback((collection, id, patch) => {
    dispatch({ type: "UPDATE", collection, id, patch });
  }, []);

  const deleteRecord = useCallback((collection, id) => {
    dispatch({ type: "DELETE", collection, id });
  }, []);

  const addFollowUp = useCallback((record) => {
    const id = `FU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({ type: "ADD", collection: "followUps", record: { ...record, id, createdAt: new Date().toISOString() } });
  }, []);

  // Accepts recordPayment(invoiceId, { amount, method, date, reference, notes }) or the
  // legacy positional form recordPayment(invoiceId, amount, method, date).
  const recordPayment = useCallback((invoiceId, arg, method, date) => {
    const current = dataRef.current;
    const invoice = current.invoices.find((i) => i.id === String(invoiceId));
    if (!invoice) return { ok: false, error: "Invoice not found." };

    const input =
      arg && typeof arg === "object"
        ? arg
        : { amount: arg, method: method || "Cash", date: date || todayISO() };
    const { valid, errors, normalized } = validatePayment({
      ...input,
      invoice,
      existingPayments: current.payments,
      today: todayISO(),
    });
    if (!valid) {
      const error = errors.duplicate
        ? "This payment looks like a duplicate of one already recorded."
        : Object.values(errors)[0];
      return { ok: false, error, errors };
    }

    const payment = normalizePayment({
      id: `PAY-${Date.now()}-${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: normalized.amount,
      method: normalized.method,
      date: normalized.date,
      reference: normalized.reference,
      notes: normalized.notes,
      status: "paid",
    });
    const paidAmount = Math.round((invoice.paidAmount + normalized.amount) * 100) / 100;
    const updatedInvoice = normalizeInvoice({ ...invoice, paidAmount }, todayISO());

    const next = {
      ...current,
      payments: [...current.payments, payment],
      invoices: current.invoices.map((i) => (i.id === invoice.id ? updatedInvoice : i)),
    };
    dataRef.current = next;
    dispatch({ type: "SET_DATA", data: next });
    return { ok: true, amount: normalized.amount, payment };
  }, []);

  // Marks an expense paid or unpaid. Paying a recurring expense also appends its next unpaid
  // instance, unless an unpaid instance with the same parent and due date already exists.
  // Returns { ok, expense, next } where next is the appended instance or null.
  const markExpenseStatus = useCallback((id, { status, paidDate, paymentMethod } = {}) => {
    const current = dataRef.current;
    const expense = current.expenses.find((e) => e.id === String(id));
    if (!expense) return { ok: false, error: "Expense not found." };
    if (status !== "paid" && status !== "unpaid") return { ok: false, error: "Status must be paid or unpaid." };

    const today = todayISO();
    const updated =
      status === "paid"
        ? markExpensePaid(expense, { paidDate, paymentMethod }, today)
        : markExpenseUnpaid(expense, today);
    updated.id = expense.id;

    let next = null;
    if (status === "paid" && updated.recurring.frequency !== "none") {
      const candidate = makeNextRecurringInstance(updated, today);
      if (candidate) {
        const parentId = candidate.recurring.parentId;
        const duplicate = current.expenses.some(
          (e) => e.status === "unpaid" && e.recurring.parentId === parentId && e.dueDate === candidate.dueDate
        );
        if (!duplicate) next = normalizeExpenseRecord(candidate);
      }
    }

    const expenses = current.expenses.map((e) => (e.id === expense.id ? updated : e));
    const nextState = { ...current, expenses: next ? [...expenses, next] : expenses };
    dataRef.current = nextState;
    dispatch({ type: "SET_DATA", data: nextState });
    return { ok: true, expense: updated, next };
  }, []);

  const resetDemoData = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const replaceAllData = useCallback((newData) => {
    if (!newData || typeof newData !== "object") return;
    dispatch({ type: "REPLACE", data: normalizeData(newData) });
  }, []);

  const value = useMemo(
    () => ({
      data,
      addRecord,
      updateRecord,
      deleteRecord,
      addFollowUp,
      recordPayment,
      markExpenseStatus,
      resetDemoData,
      replaceAllData,
      recoveredFromCorruption,
      storageError,
    }),
    [
      data,
      addRecord,
      updateRecord,
      deleteRecord,
      addFollowUp,
      recordPayment,
      markExpenseStatus,
      resetDemoData,
      replaceAllData,
      recoveredFromCorruption,
      storageError,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside <DataProvider>");
  return context;
}
