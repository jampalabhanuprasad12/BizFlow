import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Landmark,
  Plus,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useData } from "../store/index.js";
import { computeDashboard } from "../lib/dashboardMetrics.js";
import { Card, EmptyState, PageHeader } from "../components/ui/index.js";

import { FinancialCard } from "../components/dashboard/FinancialCard.jsx";
import { SmartAlerts } from "../components/dashboard/SmartAlerts.jsx";
import { RecentTransactions } from "../components/dashboard/RecentTransactions.jsx";
import { ChartCard } from "../components/dashboard/ChartCard.jsx";
import { IncomeExpenseChart } from "../components/dashboard/charts/IncomeExpenseChart.jsx";
import { CollectionTrendChart } from "../components/dashboard/charts/CollectionTrendChart.jsx";
import { InvoiceDistributionChart } from "../components/dashboard/charts/InvoiceDistributionChart.jsx";
import { CashFlowChart } from "../components/dashboard/charts/CashFlowChart.jsx";

const BUTTON_BASE =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-blue-600 text-white shadow-sm hover:bg-blue-700`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border border-slate-200 bg-white text-navy-900 hover:bg-slate-50`;
const TEXT_LINK = "text-sm font-medium text-blue-600 hover:text-blue-700";

export default function DashboardPage() {
  const { data } = useData();
  const dashboard = useMemo(() => computeDashboard(data, new Date()), [data]);
  const { kpis, hasData } = dashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back, Sofia. Here's your studio's financial health at a glance."
        actions={
          <>
            <Link to="/payments" className={SECONDARY_BUTTON}>
              Add payment
            </Link>
            <Link to="/invoices" className={PRIMARY_BUTTON}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New invoice
            </Link>
          </>
        }
      />

      {!hasData && (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Start by adding your first customer and invoice"
            description="Demo data is loaded automatically when local storage is empty, so you can explore right away."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/customers" className={SECONDARY_BUTTON}>
                  Add customer
                </Link>
                <Link to="/invoices" className={PRIMARY_BUTTON}>
                  Create invoice
                </Link>
              </div>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        <FinancialCard
          title="Total Revenue"
          value={kpis.totalRevenue}
          subtitle="Invoiced this year"
          icon={Wallet}
          tone="blue"
          to="/reports"
        />
        <FinancialCard
          title="Payments Received"
          value={kpis.paymentsReceived}
          subtitle="All recorded payments"
          icon={BadgeCheck}
          tone="green"
          to="/payments"
        />
        <FinancialCard
          title="Outstanding Payments"
          value={kpis.outstanding}
          subtitle="Unpaid invoice balances"
          icon={Clock}
          tone="orange"
          to="/invoices"
        />
        <FinancialCard
          title="Overdue Invoices"
          value={kpis.overdueAmount}
          subtitle={`${kpis.overdueCount} invoice(s)`}
          icon={AlertTriangle}
          tone="red"
          to="/invoices"
        />
        <FinancialCard
          title="Upcoming Expenses"
          value={kpis.upcomingExpenses}
          subtitle={`${kpis.upcomingExpensesCount} bill(s) in 30 days`}
          icon={Receipt}
          tone="purple"
          to="/expenses"
        />
        <FinancialCard
          title="Expected Cash Balance"
          value={kpis.expectedCashBalance}
          subtitle="Projected, next 30 days"
          icon={Landmark}
          tone="navy"
          to="/cash-flow"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SmartAlerts alerts={dashboard.alerts} />
        </div>
        <Card
          title="Recent transactions"
          action={
            <Link to="/payments" className={TEXT_LINK}>
              View all
            </Link>
          }
        >
          <RecentTransactions items={dashboard.recentTransactions} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Income vs expenses" description="Last 6 months">
          <IncomeExpenseChart data={dashboard.monthlyIncomeExpense} />
        </ChartCard>
        <ChartCard title="Payment collection trends" description="Invoiced vs collected, last 6 months">
          <CollectionTrendChart data={dashboard.collectionTrend} />
        </ChartCard>
        <ChartCard title="Outstanding invoice distribution" description="Invoices by current status">
          <InvoiceDistributionChart data={dashboard.invoiceDistribution} />
        </ChartCard>
        <div className="xl:col-span-2">
          <ChartCard title="30-day cash flow" description="Daily inflows, outflows and projected balance">
            <CashFlowChart data={dashboard.cashFlow30} />
          </ChartCard>
        </div>
      </div>

    </div>
  );
}
