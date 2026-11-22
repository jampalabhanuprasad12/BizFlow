import { useState } from "react";
import {
  validateExpense,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS_EXPENSE,
  RECURRING_FREQUENCIES,
} from "../../lib/expenses.js";
import { todayISO } from "../../lib/invoices.js";
import { Button } from "../ui/index.js";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none";

function inputCls(errors, field) {
  return errors[field] ? `${inputClass} border-red-400` : inputClass;
}

function FieldError({ errors, field }) {
  if (!errors[field]) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[field]}</p>;
}

export function ExpenseForm({ initialValues = {}, onSubmit, onCancel, submitLabel = "Save expense" }) {
  const [name, setName] = useState(initialValues.name || "");
  const [category, setCategory] = useState(initialValues.category || "Other");
  const [amount, setAmount] = useState(String(initialValues.amount ?? ""));
  const [expenseDate, setExpenseDate] = useState(initialValues.expenseDate || todayISO());
  const [dueDate, setDueDate] = useState(initialValues.dueDate || initialValues.expenseDate || todayISO());
  const [status, setStatus] = useState(initialValues.status || "unpaid");
  const [paymentMethod, setPaymentMethod] = useState(initialValues.paymentMethod || "Cash");
  const [frequency, setFrequency] = useState(initialValues.recurring?.frequency || "none");
  const [notes, setNotes] = useState(initialValues.notes || "");
  const [errors, setErrors] = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const values = {
      name,
      category,
      amount: Number(amount),
      expenseDate,
      dueDate,
      status,
      paymentMethod,
      recurring: { frequency, parentId: null },
      notes,
    };
    const result = validateExpense(values, todayISO());
    if (!result.valid) {
      setErrors(result.errors || {});
      return;
    }
    setErrors({});
    onSubmit(result.normalized);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="expense-name" className="mb-1 block text-sm font-medium text-slate-700">
          Expense name
        </label>
        <input
          id="expense-name"
          type="text"
          className={inputCls(errors, "name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        <FieldError errors={errors} field="name" />
      </div>

      <div>
        <label htmlFor="expense-category" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="expense-category"
          className={inputCls(errors, "category")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-invalid={!!errors.category}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FieldError errors={errors} field="category" />
      </div>

      <div>
        <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-slate-700">
          Amount (₹)
        </label>
        <input
          id="expense-amount"
          type="number"
          step="0.01"
          className={inputCls(errors, "amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!!errors.amount}
        />
        <FieldError errors={errors} field="amount" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-date" className="mb-1 block text-sm font-medium text-slate-700">
            Expense date
          </label>
          <input
            id="expense-date"
            type="date"
            className={inputCls(errors, "expenseDate")}
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            aria-invalid={!!errors.expenseDate}
          />
          <FieldError errors={errors} field="expenseDate" />
        </div>

        <div>
          <label htmlFor="expense-due" className="mb-1 block text-sm font-medium text-slate-700">
            Due date
          </label>
          <input
            id="expense-due"
            type="date"
            className={inputCls(errors, "dueDate")}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-invalid={!!errors.dueDate}
          />
          <FieldError errors={errors} field="dueDate" />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Payment status</span>
        <div className="inline-flex rounded-xl border border-slate-200 p-1">
          {["paid", "unpaid"].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize ${
                status === s ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s === "paid" ? "Paid" : "Unpaid"}
            </button>
          ))}
        </div>
        <FieldError errors={errors} field="status" />
      </div>

      <div>
        <label htmlFor="expense-method" className="mb-1 block text-sm font-medium text-slate-700">
          Payment method{status === "paid" ? " *" : ""}
        </label>
        <select
          id="expense-method"
          className={inputCls(errors, "paymentMethod")}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          aria-invalid={!!errors.paymentMethod}
        >
          {PAYMENT_METHODS_EXPENSE.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <FieldError errors={errors} field="paymentMethod" />
      </div>

      <div>
        <label htmlFor="expense-repeat" className="mb-1 block text-sm font-medium text-slate-700">
          Repeat
        </label>
        <select
          id="expense-repeat"
          className={inputCls(errors, "recurring")}
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          aria-invalid={!!errors.recurring}
        >
          {Object.entries(RECURRING_FREQUENCIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError errors={errors} field="recurring" />
      </div>

      <div>
        <label htmlFor="expense-notes" className="mb-1 block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="expense-notes"
          rows={3}
          maxLength={500}
          className={inputCls(errors, "notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-invalid={!!errors.notes}
        />
        <div className="flex items-center justify-between">
          <FieldError errors={errors} field="notes" />
          <span className="ml-auto text-xs text-slate-400">{notes.length}/500</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
