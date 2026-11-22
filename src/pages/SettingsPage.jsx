import { useEffect, useRef, useState } from "react";
import { Save, Upload, Trash2, Repeat } from "lucide-react";
import { useData } from "../store/index.js";
import { Button, Card, PageHeader } from "../components/ui/index.js";
import { DataManagement } from "../components/settings/DataManagement.jsx";
import { RECURRING_FREQUENCIES } from "../lib/expenses.js";
import { formatCurrency } from "../lib/format.js";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_PATTERN = /^[0-9+\-() ]+$/;
const PREFIX_PATTERN = /^[A-Za-z0-9-]{1,10}$/;
const MAX_LOGO_BYTES = 300000;
const MAX_CASH_BALANCE = 100000000;

function defaultsFrom(settings = {}) {
  return {
    businessName: settings.businessName ?? "",
    ownerName: settings.ownerName ?? "",
    businessPhone: settings.businessPhone ?? "",
    businessEmail: settings.businessEmail ?? "",
    businessAddress: settings.businessAddress ?? "",
    gstin: settings.gstin ?? "",
    cashOpeningBalance: String(settings.cashOpeningBalance ?? 0),
    paymentTermsDays: String(settings.paymentTermsDays ?? 14),
    invoicePrefix: settings.invoicePrefix ?? "INV-",
    logoDataUrl: settings.logoDataUrl ?? "",
  };
}

function validate(form) {
  const errors = {};

  const name = form.businessName.trim();
  if (name.length < 2 || name.length > 80) {
    errors.businessName = "Business name must be 2 to 80 characters.";
  }

  const email = form.businessEmail.trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.businessEmail = "Enter a valid email address.";
  }

  const phone = form.businessPhone.trim();
  if (phone && (phone.length < 7 || phone.length > 20 || !PHONE_CHARS_PATTERN.test(phone))) {
    errors.businessPhone =
      "Use 7 to 20 characters: digits, spaces, +, -, ( or ).";
  }

  const cash = Number(form.cashOpeningBalance);
  if (
    form.cashOpeningBalance.trim() === "" ||
    !Number.isFinite(cash) ||
    cash < 0 ||
    cash > MAX_CASH_BALANCE
  ) {
    errors.cashOpeningBalance = "Enter an amount between 0 and 10,00,00,000.";
  }

  const terms = form.paymentTermsDays.trim();
  if (!/^\d+$/.test(terms) || Number(terms) > 365) {
    errors.paymentTermsDays = "Enter a whole number of days from 0 to 365.";
  }

  const prefix = form.invoicePrefix.trim();
  if (!PREFIX_PATTERN.test(prefix)) {
    errors.invoicePrefix =
      "Use 1 to 10 letters, digits or hyphens.";
  }

  return errors;
}

function Field({ label, error, wide = false, children }) {
  return (
    <label className={`block space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export default function SettingsPage() {
  const {
    data,
    replaceAllData,
    updateRecord,
    storageError,
    recoveredFromCorruption,
  } = useData();

  const [form, setForm] = useState(() => ({ ...defaultsFrom(data.settings) }));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);

  // Reset the form when settings change from outside, but never discard edits.
  useEffect(() => {
    if (!dirty) {
      setForm(defaultsFrom(data.settings));
    }
  }, [data.settings, dirty]);

  // Auto-dismiss the status banner after 3 seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const update = (key, value) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setLogoError = (message) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next.logo = message;
      else delete next.logo;
      return next;
    });
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be under 300 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (!result.startsWith("data:image/")) {
        setLogoError("Please choose a PNG, JPEG, SVG or WebP image.");
        return;
      }
      setLogoError("");
      update("logoDataUrl", result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    replaceAllData({
      ...data,
      settings: {
        ...data.settings,
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        businessPhone: form.businessPhone.trim(),
        businessEmail: form.businessEmail.trim(),
        businessAddress: form.businessAddress.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        cashOpeningBalance: Number(form.cashOpeningBalance),
        paymentTermsDays: Number(form.paymentTermsDays.trim()),
        invoicePrefix: form.invoicePrefix.trim(),
        logoDataUrl: form.logoDataUrl,
        currency: "INR",
      },
    });
    setDirty(false);
    setNotice("Settings saved.");
  };

  // Latest expense in each recurring series (grouped by parentId, or own id).
  const latestBySeries = new Map();
  for (const expense of data.expenses ?? []) {
    const frequency = expense.recurring?.frequency;
    if (!frequency || frequency === "none") continue;
    const key = expense.recurring.parentId || expense.id;
    const current = latestBySeries.get(key);
    if (!current || String(expense.dueDate ?? "") > String(current.dueDate ?? "")) {
      latestBySeries.set(key, expense);
    }
  }
  const recurringBills = [...latestBySeries.values()];

  const stopRepeating = (expense) => {
    updateRecord("expenses", expense.id, {
      recurring: {
        frequency: "none",
        parentId: expense.recurring?.parentId || null,
      },
    });
    setNotice("Recurring bill stopped. Existing bills are kept.");
  };

  const cashNumber = Number(form.cashOpeningBalance) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Business details, money settings, recurring bills and your data."
        actions={
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        }
      />

      {storageError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {storageError}
        </div>
      )}

      {recoveredFromCorruption && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Saved data could not be read, so BizFlow started fresh. A copy of the unreadable data was kept in this browser.
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <Card className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Business profile</h2>
          <p className="text-sm text-slate-500">Shown on your invoices and reports.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name *" error={errors.businessName}>
            <input
              className={INPUT_CLASS}
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />
          </Field>

          <Field label="Owner name">
            <input
              className={INPUT_CLASS}
              value={form.ownerName}
              onChange={(e) => update("ownerName", e.target.value)}
            />
          </Field>

          <Field label="Phone" error={errors.businessPhone}>
            <input
              className={INPUT_CLASS}
              value={form.businessPhone}
              onChange={(e) => update("businessPhone", e.target.value)}
            />
          </Field>

          <Field label="Email" error={errors.businessEmail}>
            <input
              type="email"
              className={INPUT_CLASS}
              value={form.businessEmail}
              onChange={(e) => update("businessEmail", e.target.value)}
            />
          </Field>

          <Field label="Address" wide>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={form.businessAddress}
              onChange={(e) => update("businessAddress", e.target.value)}
            />
          </Field>

          <Field label="GSTIN (optional)">
            <input
              maxLength={15}
              className={`${INPUT_CLASS} uppercase`}
              value={form.gstin}
              onChange={(e) => update("gstin", e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Invoice prefix" error={errors.invoicePrefix}>
            <input
              className={INPUT_CLASS}
              value={form.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {form.logoDataUrl ? (
            <img
              src={form.logoDataUrl}
              alt="Business logo preview"
              className="h-16 w-16 object-contain rounded-xl border border-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
              No logo
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload logo
            </Button>
            {form.logoDataUrl && (
              <button
                type="button"
                onClick={() => update("logoDataUrl", "")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove logo
              </button>
            )}
          </div>
        </div>
        {errors.logo && <p className="text-sm text-red-600">{errors.logo}</p>}
      </Card>

      <Card className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Money &amp; invoices</h2>
          <p className="text-sm text-slate-500">Defaults used when you create new invoices.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Opening cash balance (₹)" error={errors.cashOpeningBalance}>
            <input
              type="number"
              step={100}
              min={0}
              className={INPUT_CLASS}
              value={form.cashOpeningBalance}
              onChange={(e) => update("cashOpeningBalance", e.target.value)}
            />
          </Field>

          <Field label="Default payment terms (days)" error={errors.paymentTermsDays}>
            <input
              type="number"
              step={1}
              min={0}
              max={365}
              className={INPUT_CLASS}
              value={form.paymentTermsDays}
              onChange={(e) => update("paymentTermsDays", e.target.value)}
            />
            <span className="block text-xs text-slate-500">
              The due date for new invoices is the issue date plus this many days.
            </span>
          </Field>

          <Field label="Currency">
            <select className={INPUT_CLASS} value="INR" disabled>
              <option value="INR">INR — Indian Rupee (₹)</option>
            </select>
            <span className="block text-xs text-slate-500">
              All amounts are shown in Indian rupees.
            </span>
          </Field>
        </div>

        <p className="text-sm text-slate-600">
          Currently: {formatCurrency(cashNumber)} opening cash
        </p>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recurring bills</h2>
          <p className="text-sm text-slate-500">
            Bills that repeat on a schedule. Stopping a series keeps the bills you already have.
          </p>
        </div>

        {recurringBills.length === 0 ? (
          <p className="text-sm text-slate-500">
            No recurring bills yet. Add one from the Expenses page by choosing a repeat option.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recurringBills.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{expense.name ?? expense.title ?? "Untitled expense"}</p>
                  <p className="text-sm text-slate-500">
                    {RECURRING_FREQUENCIES[expense.recurring.frequency] ?? expense.recurring.frequency}
                    {" · "}
                    {formatCurrency(Number(expense.amount) || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => stopRepeating(expense)}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:self-auto"
                >
                  <Repeat className="h-4 w-4" />
                  Stop repeating
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DataManagement />
    </div>
  );
}
