import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/index.js";
import { calculateInvoiceTotals, generateInvoiceNumber, todayISO } from "../../lib/invoices.js";
import { formatCurrency } from "../../lib/format.js";
import { useData } from "../../store/index.js";

const DEFAULT_TERM_DAYS = 14;
const NOTES_MAX = 500;
const NUMBER_PREFIX = "INV-";

const INPUT_BASE =
  "w-full rounded-xl border px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none";
const inputClass = (error) => `${INPUT_BASE} ${error ? "border-red-400" : "border-slate-200"}`;

let rowSeq = 0;
const newRow = (values = {}) => ({
  key: ++rowSeq,
  description: values.description ?? "",
  quantity: String(values.quantity ?? 1),
  unitPrice: values.unitPrice == null ? "" : String(values.unitPrice),
});

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return todayISO(new Date(year, month - 1, day + days));
}

function Field({ label, htmlFor, error, required = false, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-navy-900">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function TotalLine({ label, value, bold = false }) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        bold ? "border-t border-slate-300 pt-2 text-base font-semibold text-navy-900" : "text-slate-600"
      }`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function InvoiceForm({
  initialValues,
  customers = [],
  existingInvoices = [],
  onSubmit,
  onCancel,
  submitLabel = "Save invoice",
  mode = "create",
}) {
  const { data } = useData();
  const termsDays = Number(data.settings?.paymentTermsDays ?? 14);
  const init = initialValues ?? {};
  const isEdit = mode === "edit";
  const initialIssueDate = init.issueDate || todayISO();

  const [invoiceNumber] = useState(() =>
    isEdit && init.invoiceNumber
      ? init.invoiceNumber
      : generateInvoiceNumber(existingInvoices, NUMBER_PREFIX)
  );
  const [customerId, setCustomerId] = useState(init.customerId ?? "");
  const [issueDate, setIssueDate] = useState(initialIssueDate);
  const [dueDate, setDueDate] = useState(
    init.dueDate || addDays(initialIssueDate, termsDays)
  );
  const [items, setItems] = useState(() =>
    init.items?.length ? init.items.map((item) => newRow(item)) : [newRow()]
  );
  const [discountType, setDiscountType] = useState(init.discountType ?? "amount");
  const [discountValue, setDiscountValue] = useState(String(init.discountValue ?? 0));
  const [taxRate, setTaxRate] = useState(String(init.taxRate ?? 0));
  const [notes, setNotes] = useState(init.notes ?? "");
  const [errors, setErrors] = useState({});

  const totals = calculateInvoiceTotals({
    items: items.map((row) => ({
      quantity: Number(row.quantity) || 0,
      unitPrice: Number(row.unitPrice) || 0,
    })),
    discountType,
    discountValue: Number(discountValue) || 0,
    taxRate: Number(taxRate) || 0,
  });

  const updateRow = (key, field, value) =>
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const addRow = () => setItems((rows) => [...rows, newRow()]);
  const removeRow = (key) =>
    setItems((rows) => (rows.length > 1 ? rows.filter((row) => row.key !== key) : rows));

  const validate = () => {
    const next = {};

    if (!customerId) next.customerId = "Select a customer.";
    if (!issueDate) next.issueDate = "Enter an invoice date.";
    if (!dueDate) next.dueDate = "Enter a due date.";
    else if (issueDate && dueDate < issueDate) {
      next.dueDate = "Due date cannot be before the invoice date.";
    }

    if (items.length === 0) next.itemsGeneral = "Add at least one item.";
    const rowErrors = {};
    items.forEach((row) => {
      const rowError = {};
      if (!row.description.trim()) rowError.description = "Description is required.";
      if (!(Number(row.quantity) > 0)) rowError.quantity = "Quantity must be greater than 0.";
      if (row.unitPrice === "" || !(Number(row.unitPrice) >= 0)) {
        rowError.unitPrice = "Enter a unit price of 0 or more.";
      }
      if (Object.keys(rowError).length) rowErrors[row.key] = rowError;
    });
    if (Object.keys(rowErrors).length) next.items = rowErrors;

    const discount = Number(discountValue);
    if (!(discount >= 0)) next.discountValue = "Discount cannot be negative.";
    else if (discountType === "percent" && discount > 100) {
      next.discountValue = "Percent discount cannot exceed 100.";
    }

    const rate = Number(taxRate);
    if (!(rate >= 0 && rate <= 100)) next.taxRate = "Tax rate must be between 0 and 100.";

    if (notes.length > NOTES_MAX) {
      next.notes = `Notes must be ${NOTES_MAX} characters or fewer.`;
    }

    return next;
  };

  const submit = (isDraft) => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    const customer = customers.find((c) => c.id === customerId);
    onSubmit({
      id: isEdit ? init.id : undefined,
      invoiceNumber,
      customerId,
      customerName: customer?.name ?? init.customerName ?? "",
      issueDate,
      dueDate,
      items: items.map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
      })),
      discountType,
      discountValue: Number(discountValue) || 0,
      taxRate: Number(taxRate) || 0,
      notes: notes.trim(),
      isDraft,
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
      noValidate
      className="space-y-6"
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer" htmlFor="inv-customer" error={errors.customerId} required>
          <select
            id="inv-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            aria-invalid={Boolean(errors.customerId)}
            className={inputClass(errors.customerId)}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-navy-900">Invoice number</span>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-navy-900">
            {invoiceNumber}
          </p>
        </div>

        <Field label="Invoice date" htmlFor="inv-issue-date" error={errors.issueDate} required>
          <input
            id="inv-issue-date"
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            aria-invalid={Boolean(errors.issueDate)}
            className={inputClass(errors.issueDate)}
          />
        </Field>

        <Field label="Due date" htmlFor="inv-due-date" error={errors.dueDate} required>
          <input
            id="inv-due-date"
            type="date"
            min={issueDate}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-invalid={Boolean(errors.dueDate)}
            className={inputClass(errors.dueDate)}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">Line items</h3>

        <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
          <span className="col-span-5">Description</span>
          <span className="col-span-2">Qty</span>
          <span className="col-span-2">Unit price</span>
          <span className="col-span-2 text-right">Amount</span>
          <span className="col-span-1" />
        </div>

        {items.map((row, index) => {
          const rowError = errors.items?.[row.key] ?? {};
          const amount = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
          const n = index + 1;
          return (
            <div key={row.key} className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-12 sm:col-span-5">
                <input
                  type="text"
                  aria-label={`Description, item ${n}`}
                  value={row.description}
                  onChange={(event) => updateRow(row.key, "description", event.target.value)}
                  aria-invalid={Boolean(rowError.description)}
                  placeholder="Service description"
                  className={inputClass(rowError.description)}
                />
                {rowError.description && (
                  <p className="mt-1 text-xs text-red-600">{rowError.description}</p>
                )}
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  aria-label={`Quantity, item ${n}`}
                  min="0"
                  step="any"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                  aria-invalid={Boolean(rowError.quantity)}
                  className={inputClass(rowError.quantity)}
                />
                {rowError.quantity && (
                  <p className="mt-1 text-xs text-red-600">{rowError.quantity}</p>
                )}
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  aria-label={`Unit price, item ${n}`}
                  min="0"
                  step="any"
                  value={row.unitPrice}
                  onChange={(event) => updateRow(row.key, "unitPrice", event.target.value)}
                  aria-invalid={Boolean(rowError.unitPrice)}
                  className={inputClass(rowError.unitPrice)}
                />
                {rowError.unitPrice && (
                  <p className="mt-1 text-xs text-red-600">{rowError.unitPrice}</p>
                )}
              </div>
              <div className="col-span-3 pt-2.5 text-right tabular-nums text-navy-900 sm:col-span-2">
                {formatCurrency(amount)}
              </div>
              <div className="col-span-1 flex justify-end pt-1.5">
                <button
                  type="button"
                  aria-label={`Remove item ${n}`}
                  onClick={() => removeRow(row.key)}
                  disabled={items.length === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-smooth hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}

        {errors.itemsGeneral && <p className="text-xs text-red-600">{errors.itemsGeneral}</p>}

        <Button variant="secondary" size="sm" icon={Plus} onClick={addRow}>
          Add item
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Discount type" htmlFor="inv-discount-type">
          <select
            id="inv-discount-type"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value)}
            className={inputClass(false)}
          >
            <option value="amount">Amount (₹)</option>
            <option value="percent">Percent (%)</option>
          </select>
        </Field>

        <Field label="Discount value" htmlFor="inv-discount-value" error={errors.discountValue}>
          <input
            id="inv-discount-value"
            type="number"
            min="0"
            max={discountType === "percent" ? 100 : undefined}
            step="any"
            value={discountValue}
            onChange={(event) => setDiscountValue(event.target.value)}
            aria-invalid={Boolean(errors.discountValue)}
            className={inputClass(errors.discountValue)}
          />
        </Field>

        <Field label="Tax rate (GST %)" htmlFor="inv-tax-rate" error={errors.taxRate}>
          <input
            id="inv-tax-rate"
            type="number"
            min="0"
            max="100"
            step="any"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
            aria-invalid={Boolean(errors.taxRate)}
            className={inputClass(errors.taxRate)}
          />
        </Field>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Field label="Notes" htmlFor="inv-notes" error={errors.notes}>
          <textarea
            id="inv-notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            className={`${inputClass(errors.notes)} resize-y`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {notes.length}/{NOTES_MAX}
          </p>
        </Field>

        <dl className="ml-auto w-full max-w-sm space-y-2 self-start rounded-2xl bg-slate-50 p-4 text-sm">
          <TotalLine label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <TotalLine label="Discount" value={formatCurrency(totals.discountAmount)} />
          <TotalLine label="Taxable amount" value={formatCurrency(totals.taxableAmount)} />
          <TotalLine
            label={`Tax (GST${Number(taxRate) ? ` @ ${Number(taxRate)}%` : ""})`}
            value={formatCurrency(totals.taxAmount)}
          />
          <TotalLine label="Total" value={formatCurrency(totals.total)} bold />
        </dl>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => submit(true)}>
          Save as draft
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
