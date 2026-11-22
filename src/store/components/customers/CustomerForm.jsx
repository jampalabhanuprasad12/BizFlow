import { useId, useRef, useState } from "react";
import {
  findDuplicateCustomer,
  validateCustomer,
} from "../../lib/customers.js";

const NOTES_MAX = 500;
const FIELD_ORDER = ["name", "phone", "email"];

const INPUT_BASE =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy-900 focus:ring-2 focus:ring-blue-500 focus:outline-none";
const INPUT_ERROR = "border-red-400";

function toFormValues(source = {}) {
  return {
    name: source.name ?? "",
    phone: source.phone ?? "",
    email: source.email ?? "",
    address: source.address ?? "",
    notes: source.notes ?? "",
  };
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

export function CustomerForm({
  initialValues,
  existingCustomers = [],
  excludeId,
  onSubmit,
  onCancel,
  submitLabel = "Save customer",
}) {
  const uid = useId();
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const inputRefs = useRef({});

  const idFor = (field) => `${uid}-${field}`;
  const errorIdFor = (field) => `${uid}-${field}-error`;
  const describedBy = (field) => (errors[field] ? errorIdFor(field) : undefined);
  const inputClass = (field) => `${INPUT_BASE} ${errors[field] ? INPUT_ERROR : "border-slate-200"}`;

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = validateCustomer(values, { customers: existingCustomers, excludeId });
    if (!result.valid) {
      setErrors(result.errors);
      setFormError("");
      const firstInvalid = FIELD_ORDER.find((field) => result.errors[field]);
      if (firstInvalid) inputRefs.current[firstInvalid]?.focus();
      return;
    }

    const duplicate = findDuplicateCustomer(existingCustomers, result.normalized, excludeId);
    if (duplicate) {
      setErrors({});
      setFormError(`A customer with this phone/email already exists: ${duplicate.name}`);
      return;
    }

    setErrors({});
    setFormError("");
    onSubmit(result.normalized);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <div>
        <label htmlFor={idFor("name")} className="mb-1.5 block text-sm font-medium text-navy-900">
          Customer name <span className="text-red-500">*</span>
        </label>
        <input
          id={idFor("name")}
          ref={(el) => {
            inputRefs.current.name = el;
          }}
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className={inputClass("name")}
        />
        <FieldError id={errorIdFor("name")} message={errors.name} />
      </div>

      <div>
        <label htmlFor={idFor("phone")} className="mb-1.5 block text-sm font-medium text-navy-900">
          Phone number <span className="text-red-500">*</span>
        </label>
        <input
          id={idFor("phone")}
          ref={(el) => {
            inputRefs.current.phone = el;
          }}
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={handleChange("phone")}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("phone")}
          className={inputClass("phone")}
        />
        <FieldError id={errorIdFor("phone")} message={errors.phone} />
      </div>

      <div>
        <label htmlFor={idFor("email")} className="mb-1.5 block text-sm font-medium text-navy-900">
          Email <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id={idFor("email")}
          ref={(el) => {
            inputRefs.current.email = el;
          }}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
          className={inputClass("email")}
        />
        <FieldError id={errorIdFor("email")} message={errors.email} />
      </div>

      <div>
        <label htmlFor={idFor("address")} className="mb-1.5 block text-sm font-medium text-navy-900">
          Address <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id={idFor("address")}
          type="text"
          autoComplete="street-address"
          value={values.address}
          onChange={handleChange("address")}
          className={INPUT_BASE}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor={idFor("notes")} className="text-sm font-medium text-navy-900">
            Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <span className="text-xs text-slate-400">
            {values.notes.length}/{NOTES_MAX}
          </span>
        </div>
        <textarea
          id={idFor("notes")}
          rows={3}
          maxLength={NOTES_MAX}
          value={values.notes}
          onChange={handleChange("notes")}
          className={`${INPUT_BASE} resize-y`}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-navy-900 transition-smooth hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-smooth hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
