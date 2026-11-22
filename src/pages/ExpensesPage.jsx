import { useMemo } from "react";
import { Calculator, Plus, Tag, Wallet } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card, DataTable, PageHeader, StatCard } from "../components/ui/index.js";
import { expenses } from "../data/sampleData.js";
import { formatCurrency, formatDate } from "../lib/format.js";

const CHART_COLORS = ["#2563eb", "#7c3aed", "#16a34a", "#f97316", "#ef4444", "#64748b"];

const columns = [
  { key: "description", header: "Description" },
  { key: "category", header: "Category" },
  { key: "date", header: "Date", render: (row) => formatDate(row.date) },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    render: (row) => formatCurrency(row.amount),
  },
];

// "YYYY-MM" key in UTC so grouping does not shift with the viewer's timezone.
function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function ExpensesPage() {
  // Sample data has no live clock, so "this month" is the latest month that has expenses.
  const currentMonth = useMemo(() => {
    const latest = expenses.reduce(
      (max, e) => (new Date(e.date) > max ? new Date(e.date) : max),
      new Date(0)
    );
    return monthKey(latest);
  }, []);

  const thisMonthTotal = useMemo(
    () =>
      expenses
        .filter((e) => monthKey(e.date) === currentMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [currentMonth]
  );

  const byCategory = useMemo(() => {
    const totals = {};
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount);
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const totalAll = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const average = expenses.length ? totalAll / expenses.length : 0;
  const largest = byCategory[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track where your money goes each month."
        actions={<Button icon={Plus}>Add expense</Button>}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total this month"
          value={formatCurrency(thisMonthTotal)}
          icon={Wallet}
          accent="blue"
        />
        <StatCard
          title="Largest category"
          value={largest ? largest.name : "—"}
          delta={largest ? formatCurrency(largest.value) : undefined}
          icon={Tag}
          accent="purple"
        />
        <StatCard
          title="Average per expense"
          value={formatCurrency(average)}
          icon={Calculator}
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Spending by category"
          description="Share of total spend per category"
          className="lg:col-span-1"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {byCategory.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="All expenses" description="Every recorded expense" className="lg:col-span-2">
          <DataTable columns={columns} rows={expenses} rowKey="id" emptyText="No expenses recorded" />
        </Card>
      </div>
    </div>
  );
}
