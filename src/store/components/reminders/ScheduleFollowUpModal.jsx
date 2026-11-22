import { useState } from "react";
import { Modal } from "../customers/Modal.jsx";
import { Button } from "../ui/index.js";
import { todayISO } from "../../lib/invoices.js";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-900 focus:ring-2 focus:ring-blue-500 focus:outline-none";

// Mounted only while the modal is open, so each opening starts with a clean form.
function ScheduleForm({ invoice, onClose, onSubmit }) {
  const today = todayISO();
  const [scheduledFor, setScheduledFor] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!scheduledFor) {
      setError("Choose a follow-up date.");
      return;
    }
    if (scheduledFor < today) {
      setError("The follow-up date cannot be in the past.");
      return;
    }
    setError(null);
    onSubmit({ scheduledFor, note: note.trim() });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="followup-date" className="mb-1.5 block text-sm font-medium text-slate-700">
          Follow-up date <span className="text-red-500">*</span>
        </label>
        <input
          id="followup-date"
          type="date"
          min={today}
          required
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="followup-note" className="mb-1.5 block text-sm font-medium text-slate-700">
          Note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="followup-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`e.g. Call about ${invoice.invoiceNumber}`}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save follow-up</Button>
      </div>
    </form>
  );
}

export function ScheduleFollowUpModal({ open, invoice, onClose, onSubmit }) {
  return (
    <Modal
      open={open}
      size="sm"
      title="Schedule follow-up"
      description={invoice ? `Set a reminder to follow up on ${invoice.invoiceNumber}.` : undefined}
      onClose={onClose}
    >
      {open && invoice && <ScheduleForm invoice={invoice} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}
