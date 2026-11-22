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
import { Wallet } from "lucide-react";
import { EmptyChart } from "../EmptyChart.jsx";
import { formatCurrency } from "../../../lib/format.js";

const AXIS_TICK = { fontSize: 12, fill: "#64748b" };

const compactINR = (value) => {
  const abs = Math.abs(Number(value) || 0);
  const label = abs >= 1000 ? `${Number((abs / 1000).toFixed(1))}k` : `${Math.round(abs)}`;
  return `${value < 0 ? "-" : ""}₹${label}`;
};

export function CashFlowChart({ data = [] }) {
  const hasMovement = data.some((d) => d.inflow || d.outflow);
  if (!hasMovement) {
    return (
      <EmptyChart
        icon={Wallet}
        title="No cash movements in the next 30 days"
        description="Upcoming invoices, payments and bills will be plotted here."
        to="/invoices"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashBalanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={16}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis tickFormatter={compactINR} tickLine={false} axisLine={false} tick={AXIS_TICK} width={56} />
        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: "#f1f5f9" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
        <Bar dataKey="inflow" name="Inflow" fill="#16a34a" fillOpacity={0.8} barSize={6} radius={[2, 2, 0, 0]} />
        <Bar dataKey="outflow" name="Outflow" fill="#dc2626" fillOpacity={0.8} barSize={6} radius={[2, 2, 0, 0]} />
        <Area
          type="monotone"
          dataKey="balance"
          name="Projected balance"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#cashBalanceFill)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
