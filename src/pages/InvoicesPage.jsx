import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, Plus, Search, Wallet } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SearchInput,
  StatCard,
} from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { InvoiceForm } from "../components/invoices/InvoiceForm.jsx";
import { InvoiceTable } from "../components/invoices/InvoiceTable.jsx";
import { RecordPaymentModal } from "../components/invoices/RecordPaymentModal.jsx";
import { Modal } from "../components/customers/Modal.jsx";
import { ConfirmDialog } from "../components/customers/ConfirmDialog.jsx";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  deriveInvoiceStatus,
  filterInvoices,
  getInvoiceBalance,
} from "../lib/invoices.js";
import { formatCurrency } from "../lib/format.js";

const NOTICE_MS = 3000;
const CONTROL =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
const EMPTY_FILTERS = { query: "", status: "all", dateFrom: "", dateTo: "" };

export default function InvoicesPage() {
  const { data, addRecord, updateRecord, deleteRecord, recordPayment } = useData();
  const navigate = useNavigate();
  const invoices = data.invoices;
  const customers = data.customers;

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", invoice }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [notice, setNotice] = useState(null); // { tone: "success" | "error", text }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const rows = useMemo(() => {
    const today = new Date();
    return filterInvoices(invoices, filters, today).map((invoice) => ({
      invoice,
      balance: getInvoiceBalance(invoice),
    }));
  }, [invoices, filters]);

  const summary = useMemo(() => {
    const today = new Date();
    let totalInvoiced = 0;
    let pendingAmount = 0;
    let overdueCount = 0;
    for (const invoice of invoices) {
      const status = deriveInvoiceStatus(invoice, today);
      if (status === "draft") continue;
      const balance = getInvoiceBalance(invoice);
      totalInvoiced += balance.total;
      if (status !== "paid") pendingAmount += balance.pending;
      if (status === "overdue") overdueCount += 1;
    }
    return { totalInvoiced, pendingAmount, overdueCount };
  }, [invoices]);

  const hasFilters =
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";
  const setFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const closeForm = () => setFormState(null);
  const closePayment = () => {
    setPaymentTarget(null);
    setPaymentError(null);
  };

  const handleCreate = (values) => {
    try {
      addRecord("invoices", { ...values });
      setFormState(null);
      setNotice({ tone: "success", text: `Invoice ${values.invoiceNumber} created.` });
    } catch (error) {
      setNotice({ tone: "error", text: error?.message || "Could not create the invoice." });
    }
  };

  const handleEdit = (values) => {
    if (formState?.mode !== "edit") return;
    try {
      updateRecord("invoices", formState.invoice.id, values);
      setFormState(null);
      setNotice({ tone: "success", text: "Invoice updated." });
    } catch (error) {
      setNotice({ tone: "error", text: error?.message || "Could not update the invoice." });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRecord("invoices", deleteTarget.id);
    setDeleteTarget(null);
    setNotice({ tone: "success", text: "Invoice deleted." });
  };

  const handleRecordPayment = (values) => {
    if (!paymentTarget) return;
    const result = recordPayment(paymentTarget.id, values.amount, values.method, values.date);
    if (result.ok) {
      closePayment();
      setNotice({ tone: "success", text: `Payment of ${formatCurrency(result.amount)} recorded.` });
    } else {
      setPaymentError(result.error);
    }
  };

  const editing = formState?.mode === "edit" ? formState.invoice : null;
  const paymentBalance = paymentTarget ? getInvoiceBalance(paymentTarget) : null;
  const hasInvoices = invoices.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create, track and collect payment on every invoice."
        actions={
          <Button icon={Plus} onClick={() => setFormState({ mode: "create" })}>
            New invoice
          </Button>
        }
      />

      {notice && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total invoiced"
          value={formatCurrency(summary.totalInvoiced)}
          icon={FileText}
          accent="blue"
        />
        <StatCard
          title="Pending amount"
          value={formatCurrency(summary.pendingAmount)}
          icon={Wallet}
          accent="orange"
        />
        <StatCard
          title="Overdue invoices"
          value={summary.overdueCount}
          icon={AlertTriangle}
          accent="red"
        />
      </div>

      {!hasInvoices ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to start tracking payments."
            action={
              <Button icon={Plus} onClick={() => setFormState({ mode: "create" })}>
                New invoice
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <SearchInput
              value={filters.query}
              onChange={setFilter("query")}
              placeholder="Search invoice no., customer or service…"
              className="lg:min-w-[16rem] lg:flex-1"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="sr-only" htmlFor="invoice-status-filter">
                Filter by status
              </label>
              <select
                id="invoice-status-filter"
                value={filters.status}
                onChange={(event) => setFilter("status")(event.target.value)}
                className={CONTROL}
              >
                <option value="all">All statuses</option>
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {INVOICE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="Invoices issued from"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) => setFilter("dateFrom")(event.target.value)}
                className={CONTROL}
              />
              <input
                type="date"
                aria-label="Invoices issued to"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => setFilter("dateTo")(event.target.value)}
                className={CONTROL}
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No invoices match these filters"
                description="Try a different search term, status or date range."
                action={
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <InvoiceTable
              rows={rows}
              onView={(invoice) => navigate(`/invoices/${invoice.id}`)}
              onEdit={(invoice) => setFormState({ mode: "edit", invoice })}
              onDelete={(invoice) => setDeleteTarget(invoice)}
              onRecordPayment={(invoice) => {
                setPaymentError(null);
                setPaymentTarget(invoice);
              }}
              onPrint={(invoice) => navigate(`/invoices/${invoice.id}?print=1`)}
            />
          )}
        </>
      )}

      <Modal
        open={Boolean(formState)}
        size="lg"
        title={editing ? "Edit invoice" : "New invoice"}
        description={
          editing
            ? "Update the customer, line items or dates for this invoice."
            : "Select a customer and add the services you provided."
        }
        onClose={closeForm}
      >
        {formState && (
          <InvoiceForm
            key={editing ? editing.id : "new"}
            mode={editing ? "edit" : "create"}
            initialValues={editing ?? {}}
            customers={customers}
            existingInvoices={invoices}
            onSubmit={editing ? handleEdit : handleCreate}
            onCancel={closeForm}
            submitLabel={editing ? "Save changes" : "Create invoice"}
          />
        )}
      </Modal>

      <RecordPaymentModal
        open={Boolean(paymentTarget)}
        invoice={paymentTarget}
        pending={paymentBalance?.pending ?? 0}
        onClose={closePayment}
        onSubmit={handleRecordPayment}
        error={paymentError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete invoice"
        message={
          deleteTarget
            ? `Delete invoice ${deleteTarget.invoiceNumber}? Payments already recorded for it will be kept but unlinked.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
