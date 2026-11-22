import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import CustomerProfilePage from "./pages/CustomerProfilePage.jsx";
import InvoicesPage from "./pages/InvoicesPage.jsx";
import InvoiceDetailPage from "./pages/InvoiceDetailPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import RemindersPage from "./pages/RemindersPage.jsx";
import ExpensesPage from "./pages/ExpensesPage.jsx";
import CashFlowForecastPage from "./pages/CashFlowForecastPage.jsx";
import WhatIfSimulatorPage from "./pages/WhatIfSimulatorPage.jsx";
import ActionCenterPage from "./pages/ActionCenterPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import HelpPage from "./pages/HelpPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="cash-flow" element={<CashFlowForecastPage />} />
        <Route path="what-if" element={<WhatIfSimulatorPage />} />
        <Route path="actions" element={<ActionCenterPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
