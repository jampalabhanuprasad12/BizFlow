import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Search, UserPlus, Users, Wallet } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SearchInput,
  StatCard,
} from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { CustomerForm } from "../components/customers/CustomerForm.jsx";
import { CustomerTable } from "../components/customers/CustomerTable.jsx";
import { Modal } from "../components/customers/Modal.jsx";
import { ConfirmDialog } from "../components/customers/ConfirmDialog.jsx";
import {
  computeCustomerStats,
  findDuplicateCustomer,
  generateCustomerId,
  searchCustomers,
} from "../lib/customers.js";
import { formatCurrency } from "../lib/format.js";
import { INDIAN_DEMO_DATA } from "../data/indianDemoData.js";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "balance", label: "With balance", test: (s) => s.pendingBalance > 0 },
  { key: "settled", label: "Settled", test: (s) => s.pendingBalance <= 0 },
  { key: "overdue", label: "Overdue", test: (s) => s.overdueCount > 0 },
];

const SORTS = {
  name: (a, b) => a.customer.name.localeCompare(b.customer.name),
  balance: (a, b) => b.stats.pendingBalance - a.stats.pendingBalance,
  invoices: (a, b) => b.stats.invoiceCount - a.stats.invoiceCount,
};

const NOTICE_MS = 3000;

export default function CustomersPage() {
  const { data, addRecord, updateRecord, deleteRecord, replaceAllData } = useData();
  const navigate = useNavigate();
  const customers = data.customers;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [formState, setFormState] = useState(null); // null | { mode: "add" } | { mode: "edit", customer }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState(null); // { tone: "success" | "error", text }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const rows = useMemo(() => {
    const today = new Date();
    return customers.map((customer) => ({
      customer,
      stats: computeCustomerStats(customer, data, today),
    }));
  }, [customers, data]);

  const visibleRows = useMemo(() => {
    const trimmed = query.trim();
    const matchedIds = trimmed
      ? new Set(searchCustomers(customers, trimmed).map((c) => c.id))
      : null;
    const test = FILTERS.find((f) => f.key === filter)?.test ?? FILTERS[0].test;
    const sorter = SORTS[sort] ?? SORTS.name;

    return rows
      .filter((row) => (!matchedIds || matchedIds.has(row.customer.id)) && test(row.stats))
      .sort(sorter);
  }, [rows, customers, query, filter, sort]);

  const totals = useMemo(
    () => ({
      pending: rows.reduce((sum, row) => sum + row.stats.pendingBalance, 0),
      overdueCustomers: rows.filter((row) => row.stats.overdueCount > 0).length,
    }),
    [rows]
  );

  const closeForm = () => setFormState(null);

  const handleAdd = (values) => {
    addRecord("customers", values);
    setFormState(null);
    setNotice({ tone: "success", text: "Customer added" });
  };

  const handleEdit = (values) => {
    if (formState?.mode !== "edit") return;
    updateRecord("customers", formState.customer.id, values);
    setFormState(null);
    setNotice({ tone: "success", text: "Customer updated" });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRecord("customers", deleteTarget.id);
    setDeleteTarget(null);
    setNotice({ tone: "success", text: "Customer deleted" });
  };

  const hasCustomers = customers.length > 0;
  const editing = formState?.mode === "edit" ? formState.customer : null;

  const loadExampleCustomers = () => {
    let list = [...data.customers];
    let added = 0;
    for (const c of INDIAN_DEMO_DATA.customers) {
      if (findDuplicateCustomer(list, { name: c.name, phone: c.phone, email: c.email }, null)) continue;
      list = [...list, { ...c, id: generateCustomerId(list) }];
      added += 1;
    }
    if (added > 0) replaceAllData({ ...data, customers: list });
    setNotice({
      tone: added > 0 ? "success" : "error",
      text: added > 0
        ? `${added} example customer${added === 1 ? "" : "s"} added.`
        : "Example customers are already in your list.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage client details, invoices and balances."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={Users} onClick={loadExampleCustomers}>
              Load example customers
            </Button>
            <Button icon={UserPlus} onClick={() => setFormState({ mode: "add" })}>
              Add customer
            </Button>
          </div>
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
        <StatCard title="Total customers" value={customers.length} icon={Users} accent="blue" />
        <StatCard
          title="Total pending balance"
          value={formatCurrency(totals.pending)}
          icon={Wallet}
          accent="orange"
        />
        <StatCard
          title="Overdue customers"
          value={totals.overdueCustomers}
          icon={AlertTriangle}
          accent="red"
        />
      </div>

      {!hasCustomers ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to start tracking invoices and payments."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button icon={UserPlus} onClick={() => setFormState({ mode: "add" })}>
                  Add customer
                </Button>
                <Button variant="secondary" icon={Users} onClick={loadExampleCustomers}>
                  Load example customers
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by name or phone number…"
              className="lg:max-w-sm"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                role="group"
                aria-label="Filter customers"
                className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
              >
                {FILTERS.map((option) => {
                  const active = filter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(option.key)}
                      className={`h-8 rounded-lg px-3 text-xs font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        active ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <label className="sr-only" htmlFor="customer-sort">
                Sort customers
              </label>
              <select
                id="customer-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name A–Z</option>
                <option value="balance">Highest balance</option>
                <option value="invoices">Most invoices</option>
              </select>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No customers match your search"
                description="Try a different name, phone number or filter."
              />
            </Card>
          ) : (
            <CustomerTable
              rows={visibleRows}
              onView={(customer) => navigate(`/customers/${customer.id}`)}
              onEdit={(customer) => setFormState({ mode: "edit", customer })}
              onDelete={(customer) => setDeleteTarget(customer)}
            />
          )}
        </>
      )}

      <Modal
        open={Boolean(formState)}
        title={editing ? "Edit customer" : "Add customer"}
        description={
          editing
            ? "Update the contact details for this customer."
            : "Enter the customer's contact details."
        }
        onClose={closeForm}
      >
        {formState && (
          <CustomerForm
            key={editing ? editing.id : "new"}
            initialValues={editing ?? undefined}
            existingCustomers={customers}
            excludeId={editing?.id}
            onSubmit={editing ? handleEdit : handleAdd}
            onCancel={closeForm}
            submitLabel={editing ? "Save changes" : "Add customer"}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete customer"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.name}? Their invoices and payments will be kept, but this customer profile will be removed.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
