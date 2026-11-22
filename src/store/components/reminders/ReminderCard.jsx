import { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Copy, MessageCircle } from "lucide-react";
import { Button, Card } from "../ui/index.js";
import { BUCKET_META } from "../../lib/reminders.js";
import { formatCurrency, formatDate } from "../../lib/format.js";

const TONE_CLASSES = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

export function ReminderCard({ item, followUps = [], onCopy, onWhatsApp, onMarkContacted, onSchedule }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { invoice, customer, bucket, balance, daysOverdue } = item;
  const meta = BUCKET_META[bucket];
  const customerName = customer?.name || invoice.customerName || "Unknown customer";
  const lastContacted = followUps.find((f) => f.type === "contacted");

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy-900">{customerName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{invoice.invoiceNumber}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
            TONE_CLASSES[meta.tone] ?? TONE_CLASSES.blue
          }`}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Pending amount</p>
          <p className="text-xl font-semibold text-navy-900">{formatCurrency(balance.pending)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-slate-600">Due {formatDate(invoice.dueDate)}</p>
          <p className={daysOverdue > 0 ? "font-medium text-red-600" : "text-blue-600"}>
            {daysOverdue > 0 ? `${daysOverdue} days overdue` : "Due today"}
          </p>
        </div>
      </div>

      {lastContacted && (
        <p className="text-xs text-slate-500">
          Last contacted {formatDate(lastContacted.date)}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant="secondary" icon={Copy} onClick={onCopy}>
          Copy Reminder
        </Button>
        <Button size="sm" variant="secondary" icon={MessageCircle} onClick={onWhatsApp}>
          Open WhatsApp
        </Button>
        <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={onMarkContacted}>
          Mark as Contacted
        </Button>
        <Button size="sm" variant="secondary" icon={CalendarClock} onClick={onSchedule}>
          Schedule Follow-up
        </Button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          aria-expanded={historyOpen}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          {historyOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          History ({followUps.length})
        </button>

        {historyOpen && (
          <div className="mt-3">
            {followUps.length === 0 ? (
              <p className="text-xs text-slate-500">No follow-ups recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {followUps.map((f, index) => (
                  <li key={f.id ?? index} className="px-3 py-2.5 text-xs">
                    <p className="font-medium capitalize text-navy-900">
                      {f.type}
                      {f.channel ? ` · ${f.channel}` : ""}
                    </p>
                    {f.note && <p className="mt-0.5 text-slate-600">{f.note}</p>}
                    <p className="mt-0.5 text-slate-500">
                      {f.date ? `Logged ${formatDate(f.date)}` : ""}
                      {f.scheduledFor ? ` · Scheduled for ${formatDate(f.scheduledFor)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
