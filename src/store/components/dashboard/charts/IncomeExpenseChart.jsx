import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyChart } from "../EmptyChart.jsx";
import { formatCurrency } from "../../../lib/format.js";

const AXIS_TICK = { fontSize: 12, fill: "#64748b" };

const compactINR = (value) => {
  const abs = Math.abs(Number(value) || 0);
  const label = abs >= 1000 ? `${Number((abs / 1000).toFixed(1))}k` : `${Math.round(abs)}`;
  return `${value < 0 ? "-" : ""}₹${label}`;
};

export function IncomeExpenseChart({ data = [] }) {
  const hasActivity = data.some((d) => d.income || d.expenses);
  if (!hasActivity) {
    return (
      <EmptyChart
        icon={BarChart3}
        title="No income or expenses yet"
        description="Recorded payments and expenses will be charted here."
        to="/payments"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
        <YAxis tickFormatter={compactINR} tickLine={false} axisLine={false} tick={AXIS_TICK} width={56} />
        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: "#f1f5f9" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
