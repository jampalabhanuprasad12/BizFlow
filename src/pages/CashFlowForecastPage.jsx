import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Landmark,
  Wallet,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, DataTable, EmptyState, PageHeader, StatCard } from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { computeCashForecast } from "../lib/cashForecast.js";
import { todayISO } from "../lib/invoices.js";
import { formatCurrency, formatDate } from "../lib/format.js";

const HORIZONS = [30, 60, 90];

const pillClass = (tone) =>
  `inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
    tone === "green"
      ? "bg-green-100 text-green-700"
      : tone === "red"
        ? "bg-red-100 text-red-700"
        : tone === "orange"
          ? "bg-orange-100 text-orange-700"
          : "bg-blue-100 text-blue-700"
  }`;

function ToggleCheckbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-navy-800">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function CashFlowForecastPage() {
  const { data } = useData();
  const [horizonDays, setHorizonDays] = useState(30);
  const [showBalance, setShowBalance] = useState(true);
  const [showIncoming, setShowIncoming] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);

  const forecast = useMemo(
    () => computeCashForecast(data, { today: todayISO(), horizonDays }),
    [data, horizonDays]
  );
  const { summary, daily, weekly, transactions, assumptions } = forecast;

  const shortage = summary.hasShortage ? summary.shortageDates[0] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow Forecast"
        description="How much money you may have over the next 30, 60 or 90 days — based on your invoices, bills and payment history. Estimates, not guarantees."
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {HORIZONS.map((days) => {
              const selected = horizonDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setHorizonDays(days)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    selected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-navy-800 hover:bg-slate-100"
                  }`}
                >
                  {days} days
                </button>
              );
            })}
          </div>
        }
      />

      {shortage ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Cash may run short from {formatDate(shortage.from)} to {formatDate(shortage.to)}. Lowest
          projected balance: {formatCurrency(shortage.lowestBalance)}.
        </div>
      ) : summary.lowestBalance < 1000 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          Cash gets low on {formatDate(summary.lowestDate)}.
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Cash stays positive for the whole period.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Current cash"
          value={formatCurrency(summary.currentCash)}
          delta="Available today"
          trend="neutral"
          icon={Wallet}
          accent="blue"
        />
        <StatCard
          title="Expected incoming"
          value={formatCurrency(summary.expectedIncoming)}
          delta={`${summary.incomingCount} payment(s), ${Math.round(
            summary.estimatedShare * 100
          )}% estimated`}
          trend="up"
          icon={ArrowDownLeft}
          accent="green"
        />
        <StatCard
          title="Expected outgoing"
          value={formatCurrency(summary.expectedOutgoing)}
          delta={`${summary.outgoingCount} bill(s)`}
          trend="down"
          icon={ArrowUpRight}
          accent="orange"
        />
        <StatCard
          title="Projected closing"
          value={formatCurrency(summary.projectedClosing)}
          delta={`End of ${horizonDays} days`}
          trend="neutral"
          icon={Landmark}
          accent="purple"
        />
        <StatCard
          title="Lowest balance"
          value={formatCurrency(summary.lowestBalance)}
          delta={formatDate(summary.lowestDate)}
          trend={summary.lowestBalance < 0 ? "down" : "neutral"}
          icon={AlertTriangle}
          accent={summary.lowestBalance < 0 ? "red" : "orange"}
        />
      </div>

      <Card
        title="Cash balance forecast"
        description="Projected balance day by day. Green and red bars are payments in and bills out."
      >
        {daily.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No forecast data"
            description="Add invoices, bills or cash balance to see a forecast."
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <ToggleCheckbox checked={showBalance} onChange={setShowBalance} label="Show balance" />
              <ToggleCheckbox checked={showIncoming} onChange={setShowIncoming} label="Show incoming" />
              <ToggleCheckbox checked={showOutgoing} onChange={setShowOutgoing} label="Show outgoing" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={daily} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => "₹" + Math.round(v / 1000) + "k"} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#cashBalanceGradient)"
                  hide={!showBalance}
                />
                <Bar
                  dataKey="inflow"
                  name="Incoming"
                  fill="#16a34a"
                  opacity={0.8}
                  radius={[4, 4, 0, 0]}
                  hide={!showIncoming}
                />
                <Bar
                  dataKey="outflow"
                  name="Outgoing"
                  fill="#dc2626"
                  opacity={0.8}
                  radius={[4, 4, 0, 0]}
                  hide={!showOutgoing}
                />
                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      <Card title="Weekly breakdown" description="Money in, money out and closing balance per week.">
        <DataTable
          rowKey="index"
          rows={weekly}
          emptyText="No weeks to show."
          columns={[
            { key: "label", header: "Week", render: (row) => row.label },
            {
              key: "dates",
              header: "Dates",
              render: (row) => `${formatDate(row.start)} – ${formatDate(row.end)}`,
            },
            {
              key: "inflow",
              header: "Incoming",
              className: "text-green-600",
              render: (row) => formatCurrency(row.inflow),
            },
            {
              key: "outflow",
              header: "Outgoing",
              className: "text-red-600",
              render: (row) => formatCurrency(row.outflow),
            },
            {
              key: "net",
              header: "Net",
              render: (row) => (
                <span className={row.net >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(row.net)}
                </span>
              ),
            },
            {
              key: "closing",
              header: "Closing balance",
              render: (row) => (
                <span className={row.closing < 0 ? "text-red-600" : "text-navy-800"}>
                  {formatCurrency(row.closing)}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Forecast transactions" description="Every payment and bill included in this forecast.">
        <DataTable
          rowKey="id"
          rows={transactions}
          emptyText="No payments or bills expected in this period."
          columns={[
            { key: "date", header: "Date", render: (row) => formatDate(row.date) },
            {
              key: "type",
              header: "Type",
              render: (row) =>
                row.type === "in" ? (
                  <span className={pillClass("green")}>Incoming</span>
                ) : (
                  <span className={pillClass("red")}>Outgoing</span>
                ),
            },
            {
              key: "description",
              header: "Description",
              render: (row) => (
                <div>
                  <div className="text-navy-800">{row.description}</div>
                  {row.overdue ? (
                    <div className="text-xs font-medium text-red-600">Overdue</div>
                  ) : null}
                </div>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              render: (row) => (
                <span className={row.type === "in" ? "text-green-600" : "text-red-600"}>
                  {row.type === "in" ? "+" : "−"}
                  {formatCurrency(row.amount)}
                </span>
              ),
            },
            {
              key: "certainty",
              header: "Certainty",
              render: (row) =>
                row.estimated ? (
                  <span className={pillClass("orange")}>Estimated</span>
                ) : (
                  <span className={pillClass("blue")}>Scheduled</span>
                ),
            },
          ]}
        />
        <p className="mt-3 text-xs text-slate-500">
          Overdue invoices are expected {summary.delayDays} days from today (
          {summary.delaySource === "history"
            ? "your average payment delay"
            : "default assumption — no payment history yet"}
          ).
        </p>
      </Card>

      <Card
        title="How this forecast is calculated"
        description="The assumptions behind the numbers above."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-navy-800">
          {assumptions.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium text-navy-800">
          Projected Cash Balance = Opening Cash Balance + Expected Payments − Expected Expenses
        </p>
      </Card>
    </div>
  );
}
