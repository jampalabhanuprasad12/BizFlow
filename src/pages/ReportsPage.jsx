import { useMemo, useState } from "react";
import { useData } from "../store/index.js";
import { todayISO } from "../lib/invoices.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import { REPORT_DEFINITIONS, REPORT_RANGE_PRESETS, resolveRange, toCsv } from "../lib/reports.js";
import { PageHeader, Card, StatCard, EmptyState, DataTable, Button } from "../components/ui/index.js";
import { Download } from "lucide-react";

const PRESET_LABELS = {
  today: "Today",
  week: "This week",
  month: "This month",
  last_month: "Last month",
  custom: "Custom",
};

const MONEY_KEY =
  /amount|total|paid|pending|invoiced|collected|outstanding|revenue|expenses|profit|inflow|outflow|net|closing|cash|tax|discount|unpaid|invoiced|value/i;

const SELECTED = "bg-blue-600 text-white";
const UNSELECTED = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";

function cell(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return MONEY_KEY.test(key) ? formatCurrency(value) : String(value);
  }
  if (/date|Date/.test(key) && typeof value === "string" && value.length === 10) {
    return formatDate(value);
  }
  return String(value);
}

function titleFromKey(key) {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function ReportsPage() {
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [reportKey, setReportKey] = useState("monthly_revenue");

  const { data } = useData();
  const today = todayISO();

  const range = useMemo(
    () => resolveRange(preset, today, { from: customFrom, to: customTo }),
    [preset, today, customFrom, customTo]
  );

  const def = REPORT_DEFINITIONS.find((d) => d.key === reportKey) || REPORT_DEFINITIONS[0];

  const result = useMemo(
    () =>
      range.valid
        ? def.build(data, range, today)
        : { rows: [], totals: {}, columns: def.columns },
    [data, range, def, today]
  );

  function handleDownload() {
    const csv = toCsv(result.rows, def.columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${def.key}-${range.from}-to-${range.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const columns = def.columns.map((c) => ({
    key: c.key,
    header: c.label,
    render: (row) => cell(c.key, row[c.key]),
  }));

  const summaryEntries = Object.entries(result.totals || {}).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports"
        description="Revenue, expenses, profit, outstanding payments and cash flow, calculated from your saved records."
      />

      <div className="flex flex-wrap gap-2">
        {REPORT_RANGE_PRESETS.map((p) => {
          const selected = preset === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreset(p)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${selected ? SELECTED : UNSELECTED}`}
            >
              {PRESET_LABELS[p] ?? p}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="date"
            aria-label="From date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            aria-label="To date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {!range.valid && <p className="text-sm text-red-600">Pick both dates.</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {REPORT_DEFINITIONS.map((d) => {
          const selected = reportKey === d.key;
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setReportKey(d.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${selected ? SELECTED : UNSELECTED}`}
            >
              {d.title}
            </button>
          );
        })}
      </div>

      {!range.valid ? (
        <EmptyState icon={Download} title="Choose a date range" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryEntries.map(([key, value]) => (
              <StatCard
                key={key}
                title={titleFromKey(key)}
                value={
                  typeof value === "number" && key !== "count"
                    ? formatCurrency(value)
                    : String(value)
                }
              />
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={Download}
              disabled={!result.rows.length}
              onClick={handleDownload}
            >
              Download CSV
            </Button>
          </div>

          <Card className="overflow-x-auto">
            <DataTable
              columns={columns}
              rows={result.rows}
              rowKey={(row, i) => String(i)}
              emptyText="No records in this period"
            />
          </Card>
        </>
      )}
    </div>
  );
}
