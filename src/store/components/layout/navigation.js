import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BellRing,
  Receipt,
  TrendingUp,
  SlidersHorizontal,
  BarChart3,
  Settings,
  HelpCircle,
} from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/reminders", label: "Reminders", icon: BellRing },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/cash-flow", label: "Cash Flow Forecast", icon: TrendingUp },
  { to: "/what-if", label: "What-If Simulator", icon: SlidersHorizontal },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: HelpCircle },
];
