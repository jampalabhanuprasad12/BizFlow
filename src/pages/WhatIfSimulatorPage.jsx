import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Play, RotateCcw, ShieldAlert, Wallet } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, EmptyState, PageHeader } from "../components/ui/index.js";
import { useData } from "../store/index.js";
import { todayISO } from "../lib/invoices.js";
import { formatCurrency, formatDate } from "../lib/format.js";
import {
  SCENARIO_PRESETS,
  validateDelay,
  listUnpaidInvoices,
  runDelayScenario,
  describeScenario,
} from "../lib/whatIf.js";

const HORIZON_OPTIONS = [30, 60, 90];
const DEFAULT_DELAY = 15;
const DEFAULT_HORIZON = 90;
const MAX_RUNS = 5;

function ResultTile({ label, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
        {Icon ? <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function WhatIfSimulatorPage() {
  const data = useData();

  const today = useMemo(() => todayISO(), [data]);
  const options = useMemo(() => listUnpaidInvoices(data, today), [data, today]);
  const defaultId = options.length > 0 ? options[0].invoice.id : "";

  const [selectedId, setSelectedId] = useState("");
  const [delayDays, setDelayDays] = useState(DEFAULT_DELAY);
  const [delayInput, setDelayInput] = useState(String(DEFAULT_DELAY));
  const [delayError, setDelayError] = useState("");
  const [horizonDays, setHorizonDays] = useState(DEFAULT_HORIZON);
  const [runs, setRuns] = useState([]);
  const [notice, setNotice] = useState("");
  const [showNormal, setShowNormal] = useState(true);
  const [showDelayed, setShowDelayed] = useState(true);

  // Fall back to the default invoice if the stored choice is no longer unpaid.
  const activeId = options.some((option) => option.invoice.id === selectedId) ? selectedId : defaultId;

  const result = useMemo(
    () => runDelayScenario(data, { invoiceId: activeId, delayDays, horizonDays, today }),
    [data, activeId, delayDays, horizonDays, today]
  );

  const handleDelayInput = (value) => {
    setDelayInput(value);
    const check = validateDelay(value);
    if (check.valid) {
      setDelayDays(check.days);
      setDelayError("");
    } else {
      setDelayError(check.error);
    }
  };

  const pickPreset = (days) => {
    setDelayDays(days);
    setDelayInput(String(days));
    setDelayError("");
  };

  const runSimulation = () => {
    if (!result.ok) return;
    const entry = {
      invoiceNumber: result.invoice.invoiceNumber,
      delayDays: result.delayDays,
      horizonDays: result.horizonDays,
      difference: result.difference,
      hasShortage: result.hasShortage,
      at: new Date().toLocaleTimeString(),
    };
    setRuns((previous) => [entry, ...previous].slice(0, MAX_RUNS));
    setNotice("Simulation run added to history.");
  };

  const resetScenario = () => {
    setSelectedId("");
    setDelayDays(DEFAULT_DELAY);
    setDelayInput(String(DEFAULT_DELAY));
    setDelayError("");
    setHorizonDays(DEFAULT_HORIZON);
    setRuns([]);
    setNotice("");
    setShowNormal(true);
    setShowDelayed(true);
  };

  const difference = result.ok ? result.difference : 0;
  const differenceColor = difference >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-If Simulator"
        description="Test a late payment before it happens. Simulations use temporary copies — your real invoices and payments are never changed."
        actions={
          <>
            <Button variant="secondary" icon={RotateCcw} onClick={resetScenario}>
              Reset scenario
            </Button>
            <Button variant="primary" icon={Play} onClick={runSimulation} disabled={!result.ok}>
              Run simulation
            </Button>
          </>
        }
      />

      {notice ? (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <Card title="Choose a scenario" description="Pick an unpaid invoice and how late it will be paid">
        {options.length === 0 ? (
          <EmptyState
            title="No unpaid invoices to simulate"
            description="Once you have invoices that are still awaiting payment, you can test how a late payment would affect your cash."
          />
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="whatif-invoice" className="mb-2 block text-sm font-medium text-navy-900">
                Unpaid invoice
              </label>
              <select
                id="whatif-invoice"
                value={activeId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-blue-500 focus:outline-none"
              >
                {options.map(({ invoice, pending, customerName }) => (
                  <option key={invoice.id} value={invoice.id}>
                    {`${invoice.invoiceNumber} · ${customerName} · ${formatCurrency(pending)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-navy-900">Payment delay</p>
              <div className="flex flex-wrap items-start gap-3">
                {SCENARIO_PRESETS.map((days) => {
                  const selected = delayDays === days && !delayError;
                  return (
                    <button
                      key={days}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => pickPreset(days)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 bg-white text-navy-900 hover:bg-slate-50"
                      }`}
                    >
                      {days} days
                    </button>
                  );
                })}
                <div>
                  <label htmlFor="whatif-custom-delay" className="sr-only">
                    Custom delay in days
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="whatif-custom-delay"
                      type="number"
                      min={0}
                      max={180}
                      step={1}
                      value={delayInput}
                      onChange={(event) => handleDelayInput(event.target.value)}
                      aria-invalid={delayError ? "true" : "false"}
                      aria-describedby={delayError ? "whatif-custom-delay-error" : undefined}
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-sm text-slate-500">days (custom)</span>
                  </div>
                  {delayError ? (
                    <p id="whatif-custom-delay-error" className="mt-1 text-sm text-red-600">
                      {delayError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-navy-900">Forecast horizon</p>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Forecast horizon">
                {HORIZON_OPTIONS.map((days) => {
                  const selected = horizonDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setHorizonDays(days)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selected ? "bg-blue-600 text-white" : "bg-white text-navy-900 hover:bg-slate-50"
                      }`}
                    >
                      {days} days
                    </button>
                  );
                })}
              </div>
            </div>

            {result.ok ? (
              <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">{describeScenario(result)}</div>
            ) : null}
          </div>
        )}
      </Card>

      {!result.ok ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{result.error}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ResultTile label="Original expected date" icon={CalendarDays}>
              <p className="text-lg font-semibold text-navy-900">{formatDate(result.originalDate)}</p>
            </ResultTile>

            <ResultTile label="Simulated payment date" icon={CalendarDays}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-navy-900">{formatDate(result.simulatedDate)}</p>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {`+${result.delayDays} days`}
                </span>
              </div>
              {result.leavesHorizon ? (
                <p className="mt-2 text-sm text-orange-600">Falls after the forecast period</p>
              ) : null}
            </ResultTile>

            <ResultTile label="Original projected balance" icon={Wallet}>
              <p className="text-lg font-semibold text-navy-900">{formatCurrency(result.originalBalance)}</p>
            </ResultTile>

            <ResultTile label="New projected balance" icon={Wallet}>
              <p className="text-lg font-semibold text-navy-900">{formatCurrency(result.newBalance)}</p>
            </ResultTile>

            <ResultTile label="Difference in available cash">
              <p className={`text-lg font-semibold ${differenceColor}`}>
                {`${difference >= 0 ? "+" : "−"}${formatCurrency(Math.abs(difference))}`}
              </p>
            </ResultTile>

            <ResultTile label="Cash shortage">
              {result.hasShortage ? (
                <p className="flex items-center gap-2 text-lg font-semibold text-red-600">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                  {`Yes — from ${formatDate(result.shortageDate)}`}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-lg font-semibold text-green-600">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  No shortage
                </p>
              )}
              {result.shortageCreated ? (
                <p className="mt-2 text-sm text-red-600">This delay creates a new shortage.</p>
              ) : null}
            </ResultTile>
          </div>

          <Card title="Normal vs delayed cash flow" description="Projected daily balance. The delayed line moves the payment later.">
            <div className="mb-4 flex flex-wrap gap-6 text-sm text-navy-900">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showNormal}
                  onChange={(event) => setShowNormal(event.target.checked)}
                  className="accent-blue-600"
                />
                Show normal
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDelayed}
                  onChange={(event) => setShowDelayed(event.target.checked)}
                  className="accent-purple-600"
                />
                Show delayed
              </label>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => "₹" + Math.round(v / 1000) + "k"} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="normal"
                  name="Normal cash flow"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                  hide={!showNormal}
                />
                <Line
                  type="monotone"
                  dataKey="delayed"
                  name="Delayed payment"
                  stroke="#7c3aed"
                  strokeDasharray="6 4"
                  strokeWidth={2.5}
                  dot={false}
                  hide={!showDelayed}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      <Card title="Run history" description="Session only">
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">
            Runs appear here after you press Run simulation. They are kept only for this visit.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm text-navy-900">
            {runs.map((run, index) => (
              <li key={`${run.at}-${index}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2">
                <span className="font-medium">{run.invoiceNumber}</span>
                <span>{`${run.delayDays} days late`}</span>
                <span>{`${run.horizonDays}-day horizon`}</span>
                <span className={run.difference >= 0 ? "text-green-600" : "text-red-600"}>
                  {`${run.difference >= 0 ? "+" : "−"}${formatCurrency(Math.abs(run.difference))}`}
                </span>
                <span>{run.hasShortage ? "Shortage: Yes" : "Shortage: No"}</span>
                <span className="text-slate-400">{run.at}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        Simulation only. Nothing here is saved to invoices or payments. No data leaves this browser.
      </p>
    </div>
  );
}
