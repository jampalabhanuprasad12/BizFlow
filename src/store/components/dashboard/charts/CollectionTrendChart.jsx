import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { EmptyChart } from "../EmptyChart.jsx";
import { formatCurrency } from "../../../lib/format.js";

const AXIS_TICK = { fontSize: 12, fill: "#64748b" };

const compactINR = (value) => {
  const abs = Math.abs(Number(value) || 0);
  const label = abs >= 1000 ? `${Number((abs / 1000).toFixed(1))}k` : `${Math.round(abs)}`;
  return `${value < 0 ? "-" : ""}₹${label}`;
};

export function CollectionTrendChart({ data = [] }) {
  const hasActivity = data.some((d) => d.invoiced || d.collected);
  if (!hasActivity) {
    return (
      <EmptyChart
        icon={TrendingUp}
        title="No collection activity yet"
        description="Invoices issued and payments received will show up here."
        to="/invoices"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="collectionInvoicedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="collectionCollectedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
        <YAxis tickFormatter={compactINR} tickLine={false} axisLine={false} tick={AXIS_TICK} width={56} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="invoiced"
          name="Invoiced"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#collectionInvoicedFill)"
        />
        <Area
          type="monotone"
          dataKey="collected"
          name="Collected"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#collectionCollectedFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
