import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { InvoiceDocument } from "../components/invoices/InvoiceDocument.jsx";
import { InvoiceForm } from "../components/invoices/InvoiceForm.jsx";
import { RecordPaymentModal } from "../components/invoices/RecordPaymentModal.jsx";
import { InvoiceStatusBadge } from "../components/invoices/StatusPill.jsx";
import { Modal } from "../components/customers/Modal.jsx";
import { ConfirmDialog } from "../components/customers/ConfirmDialog.jsx";
import { matchesCustomer } from "../lib/customers.js";
import { deriveInvoiceStatus, getInvoiceBalance } from "../lib/invoices.js";
import { getFollowUpsForInvoice } from "../lib/reminders.js";
import { formatCurrency, formatDate } from "../lib/format.js";

const NOTICE_MS = 3000;

// Print-only rules: show just the invoice document, hiding the app shell and controls.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area {
    position: absolute !important;
    left: 0;
    top: 0;
    width: 100% !important;
    box-shadow: none !important;
    border: none !important;
  }
  .no-print { display: none !important; }
}
`;

const LINK_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-smooth hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, updateRecord, deleteRecord, recordPayment } = useData();

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: "success" | "error", text }

  const invoice = data.invoices.find((inv) => inv.id === String(id));
  const shouldPrint = new URLSearchParams(location.search).get("print") === "1";

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Opened from the list's Print action: print once after the document has mounted.
  useEffect(() => {
    if (shouldPrint && invoice) window.print();
    // Runs once per invoice; the print query flag is read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPrint, invoice?.id]);

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Card>
          <EmptyState
            icon={FileText}
            title="Invoice not found"
            description="This invoice doesn't exist or may have been deleted."
            action={
              <Link
                to="/invoices"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-smooth hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to invoices
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const business = data.settings;
  const customer = data.customers.find((c) => matchesCustomer(invoice, c));
  const customerName = customer?.name || invoice.customerName || "Unknown customer";
  const balance = getInvoiceBalance(invoice);
  const status = deriveInvoiceStatus(invoice, new Date());
  const canRecordPayment = balance.pending > 0 && status !== "draft";
  const followUps = getFollowUpsForInvoice(data.followUps, invoice.id);

  const handleEdit = (values) => {
    updateRecord("invoices", invoice.id, values);
    setEditOpen(false);
    setNotice({ tone: "success", text: "Invoice updated." });
  };

  const handleDelete = () => {
    deleteRecord("invoices", invoice.id);
    setDeleteOpen(false);
    navigate("/invoices");
  };

  const handleRecordPayment = (values) => {
    const result = recordPayment(invoice.id, values.amount, values.method, values.date);
    if (result.ok) {
      setPaymentOpen(false);
      setPaymentError(null);
      setNotice({ tone: "success", text: `Payment of ${formatCurrency(result.amount)} recorded.` });
    } else {
      setPaymentError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <PageHeader
        title={invoice.invoiceNumber}
        description={customerName}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Link to="/invoices" className={LINK_BUTTON}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              title="Use 'Save as PDF' in the print dialog"
              onClick={() => window.print()}
            >
              Download PDF
            </Button>
            {canRecordPayment && (
              <Button
                icon={Wallet}
                onClick={() => {
                  setPaymentError(null);
                  setPaymentOpen(true);
                }}
              >
                Record payment
              </Button>
            )}
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              icon={Trash2}
              className="text-red-600 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className={`no-print rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={formatCurrency(balance.total)} icon={FileText} accent="blue" />
        <StatCard title="Paid" value={formatCurrency(balance.paid)} icon={CheckCircle2} accent="green" />
        <StatCard
          title="Pending"
          value={formatCurrency(balance.pending)}
          icon={Clock}
          accent="orange"
        />
        <StatCard title="Status" value={<InvoiceStatusBadge status={status} />} icon={Receipt} accent="purple" />
      </div>

      <Card className="print-area">
        <InvoiceDocument invoice={invoice} business={business} customer={customer} />
      </Card>

      <Card title="Follow-up history" description="Reminders, contact attempts and scheduled follow-ups for this invoice.">
        {followUps.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-ups recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {followUps.map((f, index) => (
              <li key={f.id ?? index} className="py-3 text-sm">
                <p className="font-medium capitalize text-navy-900">
                  {f.type}
                  {f.channel ? ` · ${f.channel}` : ""}
                </p>
                {f.note && <p className="text-slate-600">{f.note}</p>}
                <p className="text-xs text-slate-500">
                  {f.date ? `Logged ${formatDate(f.date)}` : ""}
                  {f.scheduledFor ? ` · Scheduled for ${formatDate(f.scheduledFor)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={editOpen}
        size="lg"
        title="Edit invoice"
        description="Update the customer, line items or dates for this invoice."
        onClose={() => setEditOpen(false)}
      >
        {editOpen && (
          <InvoiceForm
            key={invoice.id}
            mode="edit"
            initialValues={invoice}
            customers={data.customers}
            existingInvoices={data.invoices}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <RecordPaymentModal
        open={paymentOpen}
        invoice={invoice}
        pending={balance.pending}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentError(null);
        }}
        onSubmit={handleRecordPayment}
        error={paymentError}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete invoice"
        message={`Delete invoice ${invoice.invoiceNumber}? Payments already recorded for it will be kept but unlinked.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
