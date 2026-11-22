import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus, Wallet, CalendarDays } from "lucide-react";
import { Button, PageHeader, SearchInput, StatCard } from "../components/ui/index.js";
import { Modal } from "../components/customers/Modal.jsx";
import { PaymentForm } from "../components/payments/PaymentForm.jsx";
import { PaymentList } from "../components/payments/PaymentList.jsx";
import { useData } from "../store/index.js";
import { matchesCustomer } from "../lib/customers.js";
import { PAYMENT_METHODS, computePaymentTotals, paymentsForInvoice } from "../lib/payments.js";
import { deriveInvoiceStatus, getInvoiceBalance, todayISO } from "../lib/invoices.js";
import { formatCurrency } from "../lib/format.js";

const NOTICE_MS = 3000;

function customerNameFor(record, customers) {
  const customer = (customers ?? []).find((c) => matchesCustomer(record, c));
  return customer?.name || record.customerName || "Unknown customer";
}

export default function PaymentsPage() {
  const { data, recordPayment } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectId = searchParams.get("invoice");
  const today = todayISO();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [modalError, setModalError] = useState(null);
  const [notice, setNotice] = useState(null); // { tone: "success" | "error", text }
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const openInvoices = useMemo(
    () =>
      data.invoices.filter(
        (inv) => deriveInvoiceStatus(inv, today) !== "draft" && getInvoiceBalance(inv).pending > 0
      ),
    [data.invoices, today]
  );
  const selectedInvoice = openInvoices.find((inv) => inv.id === selectedId) ?? null;

  const totals = useMemo(() => computePaymentTotals(data.payments, today), [data.payments, today]);

  const visiblePayments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...data.payments]
      .filter((p) => methodFilter === "all" || p.method === methodFilter)
      .filter(
        (p) =>
          !needle ||
          [customerNameFor(p, data.customers), p.invoiceId, p.reference].some((value) =>
            String(value ?? "").toLowerCase().includes(needle)
          )
      )
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [data.payments, data.customers, query, methodFilter]);

  // Deep link from an invoice: ?invoice=ID opens the modal with that invoice preselected.
  useEffect(() => {
    if (!preselectId) return;
    setSelectedId(preselectId);
    setModalError(null);
    setModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [preselectId, setSearchParams]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const closeModal = () => {
    setModalOpen(false);
    setModalError(null);
    setSelectedId("");
  };

  const handleRecord = (values) => {
    if (!selectedInvoice) return;
    const result = recordPayment(selectedInvoice.id, values);
    if (result.ok) {
      setNotice({
        tone: "success",
        text: `Payment of ${formatCurrency(result.amount ?? values.amount)} recorded for ${selectedInvoice.invoiceNumber}`,
      });
      closeModal();
    } else {
      setModalError(result.error ?? "The payment could not be recorded.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record payments against invoices and track what has been received."
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setModalError(null);
              setModalOpen(true);
            }}
          >
            Record payment
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <StatCard
          title="Total received"
          value={formatCurrency(totals.totalReceived)}
          icon={Wallet}
          accent="green"
        />
        <StatCard
          title="Received this month"
          value={formatCurrency(totals.receivedThisMonth)}
          icon={CalendarDays}
          accent="blue"
        />
        <StatCard
          title="Open invoices"
          value={String(openInvoices.length)}
          icon={FileText}
          accent="orange"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search customer, invoice or reference…"
          className="flex-1"
        />
        <select
          aria-label="Filter by payment method"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
        >
          <option value="all">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <PaymentList payments={visiblePayments} customers={data.customers} />

      <Modal
        open={modalOpen}
        size="md"
        title="Record payment"
        description="Select an open invoice, then enter the payment details."
        onClose={closeModal}
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="payment-invoice" className="mb-1.5 block text-sm font-medium text-slate-700">
              Invoice
            </label>
            <select
              id="payment-invoice"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setModalError(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">
                {openInvoices.length === 0 ? "No open invoices" : "Select an invoice…"}
              </option>
              {openInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {`${inv.invoiceNumber} · ${customerNameFor(inv, data.customers)} · ${formatCurrency(
                    getInvoiceBalance(inv).pending
                  )}`}
                </option>
              ))}
            </select>
          </div>

          {modalError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {modalError}
            </div>
          )}

          {selectedInvoice && (
            <PaymentForm
              key={selectedInvoice.id}
              invoice={selectedInvoice}
              existingPayments={paymentsForInvoice(data.payments, selectedInvoice.id)}
              onSubmit={handleRecord}
              onCancel={closeModal}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
