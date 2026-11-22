import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, Clock } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "../components/ui/index.js";
import { ReminderCard } from "../components/reminders/ReminderCard.jsx";
import { ScheduleFollowUpModal } from "../components/reminders/ScheduleFollowUpModal.jsx";
import { useData } from "../store/index.js";
import { todayISO } from "../lib/invoices.js";
import { formatDate } from "../lib/format.js";
import {
  BUCKET_META,
  buildReminderMessage,
  buildReminders,
  buildWhatsAppUrl,
  getFollowUpsForInvoice,
} from "../lib/reminders.js";

const NOTICE_MS = 3000;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "due_today", label: "Due today" },
  { value: "overdue_1_7", label: "1–7 days" },
  { value: "overdue_8_15", label: "8–15 days" },
  { value: "overdue_15_plus", label: "15+ days" },
];

const BUCKET_STATS = [
  { bucket: "due_today", icon: Bell, accent: "blue" },
  { bucket: "overdue_1_7", icon: Clock, accent: "orange" },
  { bucket: "overdue_8_15", icon: AlertTriangle, accent: "red" },
  { bucket: "overdue_15_plus", icon: AlertCircle, accent: "red" },
];

// Clipboard API first; fall back to a hidden textarea for browsers or contexts without it.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context: fall through to the textarea method.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

export default function RemindersPage() {
  const { data, addFollowUp } = useData();
  const today = todayISO();

  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState(null); // { tone: "success" | "error", text }
  const [scheduleInvoice, setScheduleInvoice] = useState(null);

  const reminders = useMemo(
    () => buildReminders(data.invoices, data.customers, today),
    [data.invoices, data.customers, today]
  );

  const counts = useMemo(() => {
    const result = { due_today: 0, overdue_1_7: 0, overdue_8_15: 0, overdue_15_plus: 0 };
    reminders.forEach((r) => {
      result[r.bucket] += 1;
    });
    return result;
  }, [reminders]);

  const visible = useMemo(
    () => (filter === "all" ? reminders : reminders.filter((r) => r.bucket === filter)),
    [reminders, filter]
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const businessName = data.settings?.businessName ?? "";

  const messageFor = (item) =>
    buildReminderMessage({
      customerName: item.customer?.name || item.invoice.customerName || "there",
      invoiceNumber: item.invoice.invoiceNumber,
      amount: item.balance.pending,
      dueDate: item.invoice.dueDate,
      businessName,
    });

  const handleCopy = async (item) => {
    const copied = await copyText(messageFor(item));
    if (!copied) {
      setNotice({ tone: "error", text: "Could not copy the reminder. Select the message manually." });
      return;
    }
    addFollowUp({
      invoiceId: item.invoice.id,
      type: "reminder",
      channel: "copy",
      note: "Copied reminder message",
      date: today,
      scheduledFor: null,
    });
    setNotice({ tone: "success", text: "Reminder copied. Paste it into WhatsApp or SMS yourself." });
  };

  const handleWhatsApp = (item) => {
    const phone = item.customer?.phone;
    if (!phone) {
      setNotice({ tone: "error", text: "No phone number on file for this customer. Copy the reminder instead." });
      return;
    }
    window.open(buildWhatsAppUrl(phone, messageFor(item)), "_blank", "noopener");
    addFollowUp({
      invoiceId: item.invoice.id,
      type: "reminder",
      channel: "whatsapp",
      note: "Opened WhatsApp with prefilled message (sent manually)",
      date: today,
      scheduledFor: null,
    });
    setNotice({
      tone: "success",
      text: "WhatsApp opened with a prefilled message. Review it and press send yourself.",
    });
  };

  const handleMarkContacted = (item) => {
    addFollowUp({
      invoiceId: item.invoice.id,
      type: "contacted",
      channel: "manual",
      note: "Marked as contacted",
      date: today,
      scheduledFor: null,
    });
    setNotice({ tone: "success", text: "Marked as contacted." });
  };

  const handleSchedule = ({ scheduledFor, note }) => {
    if (!scheduleInvoice) return;
    addFollowUp({
      invoiceId: scheduleInvoice.id,
      type: "scheduled",
      channel: null,
      scheduledFor,
      note: note || null,
    });
    setScheduleInvoice(null);
    setNotice({ tone: "success", text: `Follow-up scheduled for ${formatDate(scheduledFor)}.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Reminders"
        description="Follow up on invoices due today and overdue payments."
      />

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        {BUCKET_STATS.map(({ bucket, icon, accent }) => (
          <StatCard
            key={bucket}
            title={BUCKET_META[bucket].label}
            value={String(counts[bucket])}
            icon={icon}
            accent={accent}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Filter reminders by overdue age"
        className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
      >
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-navy-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            reminders.length === 0
              ? "No reminders right now — every invoice is up to date."
              : "No reminders in this range"
          }
          description={reminders.length === 0 ? undefined : "Try another filter."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-6">
          {visible.map((item) => (
            <ReminderCard
              key={item.invoice.id}
              item={item}
              followUps={getFollowUpsForInvoice(data.followUps, item.invoice.id)}
              onCopy={() => handleCopy(item)}
              onWhatsApp={() => handleWhatsApp(item)}
              onMarkContacted={() => handleMarkContacted(item)}
              onSchedule={() => setScheduleInvoice(item.invoice)}
            />
          ))}
        </div>
      )}

      <ScheduleFollowUpModal
        open={Boolean(scheduleInvoice)}
        invoice={scheduleInvoice}
        onClose={() => setScheduleInvoice(null)}
        onSubmit={handleSchedule}
      />
    </div>
  );
}
