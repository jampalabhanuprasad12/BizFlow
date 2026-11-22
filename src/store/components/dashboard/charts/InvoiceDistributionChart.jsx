import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { EmptyChart } from "../EmptyChart.jsx";
import { formatCurrency } from "../../../lib/format.js";

const STATUS_COLORS = {
  Paid: "#16a34a",
  "Partially Paid": "#ea580c",
  Unpaid: "#2563eb",
  Overdue: "#dc2626",
  Draft: "#94a3b8",
};

export function InvoiceDistributionChart({ data = [] }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total <= 0) {
    return (
      <EmptyChart
        icon={PieIcon}
        title="No invoices to chart yet"
        description="The breakdown of your invoices by status appears once you create some."
        to="/invoices"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, item) => [
            formatCurrency(value),
            `${name} · ${item?.payload?.count ?? 0} invoice(s)`,
          ]}
        />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
