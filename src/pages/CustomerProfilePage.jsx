import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { CustomerForm } from "../components/customers/CustomerForm.jsx";
import { Modal } from "../components/customers/Modal.jsx";
import { ConfirmDialog } from "../components/customers/ConfirmDialog.jsx";
import { computeCustomerStats } from "../lib/customers.js";
import { toISODate } from "../lib/dashboardMetrics.js";
import { formatCurrency, formatDate } from "../lib/format.js";

const CLOSED_STATUSES = ["paid", "draft"];

// An open invoice past its due date is shown as overdue, whatever its stored status says.
function effectiveStatus(invoice, todayISO) {
  if (invoice.status === "overdue") return "overdue";
  if (!CLOSED_STATUSES.includes(invoice.status) && invoice.dueDate && invoice.dueDate < todayISO) {
    return "overdue";
  }
  return invoice.status;
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 whitespace-pre-line break-words text-sm text-navy-900">{children || "—"}</p>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams();
  const { data, updateRecord, deleteRecord } = useData();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const customer = data.customers.find((c) => c.id === String(id)) ?? null;
  const todayISO = toISODate(new Date());

  const stats = useMemo(
    () => (customer ? computeCustomerStats(customer, data, new Date()) : null),
    [customer, data]
  );

  const invoiceRows = useMemo(
    () =>
      (stats?.invoices ?? []).map((invoice) => ({
        ...invoice,
        displayStatus: effectiveStatus(invoice, todayISO),
      })),
    [stats, todayISO]
  );

  if (!customer) {
    return (
      <div className="space-y-6">
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Customer not found"
            description="This customer may have been deleted or the link is incorrect."
            action={
              <Link
                to="/customers"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-smooth hover:bg-blue-700"
              >
                Back to customers
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const overdueInvoices = invoiceRows.filter((inv) => inv.displayStatus === "overdue").length;
  const payments = stats.payments ?? [];

  const invoiceColumns = [
    { key: "id", header: "Invoice", render: (row) => <span className="font-medium">{row.id}</span> },
    { key: "issueDate", header: "Issue date", render: (row) => formatDate(row.issueDate) },
    { key: "dueDate", header: "Due date", render: (row) => formatDate(row.dueDate) },
    { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
    { key: "paidAmount", header: "Paid", render: (row) => formatCurrency(row.paidAmount) },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.displayStatus} />,
    },
  ];

  const paymentColumns = [
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "method", header: "Method" },
    { key: "invoiceId", header: "Invoice", render: (row) => row.invoiceId || "—" },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-medium text-green-600">{formatCurrency(row.amount)}</span>,
    },
  ];

  const handleSave = (values) => {
    updateRecord("customers", customer.id, values);
    setEditing(false);
  };

  const handleDelete = () => {
    deleteRecord("customers", customer.id);
    setConfirmingDelete(false);
    navigate("/customers");
  };

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-smooth hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to customers
      </Link>

      <PageHeader
        title={customer.name}
        description="Customer profile, invoices and payment history."
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Card title="Contact details">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DetailRow icon={Phone} label="Phone">
            {customer.phone}
          </DetailRow>
          <DetailRow icon={Mail} label="Email">
            {customer.email}
          </DetailRow>
          <DetailRow icon={MapPin} label="Address">
            {customer.address}
          </DetailRow>
          <DetailRow icon={FileText} label="Notes">
            {customer.notes}
          </DetailRow>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total invoiced" value={formatCurrency(stats.totalAmount)} icon={Receipt} accent="blue" />
        <StatCard title="Amount paid" value={formatCurrency(stats.amountPaid)} icon={Wallet} accent="green" />
        <StatCard
          title="Pending balance"
          value={
            <span className={stats.pendingBalance > 0 ? "text-red-600" : "text-green-600"}>
              {formatCurrency(stats.pendingBalance)}
            </span>
          }
          icon={Clock}
          accent={stats.pendingBalance > 0 ? "red" : "green"}
        />
        <StatCard
          title="Overdue invoices"
          value={overdueInvoices}
          icon={AlertTriangle}
          accent={overdueInvoices > 0 ? "red" : "orange"}
        />
      </div>

      <Card title="Invoice history" description={`${invoiceRows.length} invoice(s)`}>
        <DataTable
          columns={invoiceColumns}
          rows={invoiceRows}
          rowKey="id"
          emptyText="No invoices for this customer yet."
        />
      </Card>

      <Card title="Payment history" description={`${payments.length} payment(s)`}>
        <DataTable
          columns={paymentColumns}
          rows={payments}
          rowKey="id"
          emptyText="No payments recorded for this customer yet."
        />
      </Card>

      <Modal open={editing} title="Edit customer" onClose={() => setEditing(false)}>
        {editing && (
          <CustomerForm
            initialValues={customer}
            existingCustomers={data.customers}
            excludeId={customer.id}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete customer"
        message={`Delete ${customer.name}? Their invoices and payments will be kept, but this customer profile will be removed.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
