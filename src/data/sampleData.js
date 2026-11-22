// Sample data for layout preview — replace with stored data in later stages.

export const customers = [
  { id: "CUS-001", name: "Emma Clarke", phone: "07700 900123", email: "emma.clarke@example.com", totalSpent: 1240, balance: 0, status: "paid" },
  { id: "CUS-002", name: "Liam Patel", phone: "07700 900456", email: "liam.patel@example.com", totalSpent: 860, balance: 120, status: "pending" },
  { id: "CUS-003", name: "Olivia Brown", phone: "07700 900789", email: "olivia.brown@example.com", totalSpent: 2315, balance: 0, status: "paid" },
  { id: "CUS-004", name: "Noah Williams", phone: "07700 900321", email: "noah.williams@example.com", totalSpent: 430, balance: 90, status: "overdue" },
  { id: "CUS-005", name: "Ava Thompson", phone: "07700 900654", email: "ava.thompson@example.com", totalSpent: 975, balance: 45, status: "pending" },
  { id: "CUS-006", name: "Isla Robinson", phone: "07700 900987", email: "isla.robinson@example.com", totalSpent: 1680, balance: 0, status: "paid" },
  { id: "CUS-007", name: "Ethan Davies", phone: "07700 900112", email: "ethan.davies@example.com", totalSpent: 310, balance: 210, status: "overdue" },
  { id: "CUS-008", name: "Mia Johnson", phone: "07700 900334", email: "mia.johnson@example.com", totalSpent: 1520, balance: 65, status: "pending" },
];

export const invoices = [
  { id: "INV-1001", customerName: "Emma Clarke", amount: 185, dueDate: "2025-05-10T00:00:00.000Z", status: "paid" },
  { id: "INV-1002", customerName: "Liam Patel", amount: 120, dueDate: "2025-06-20T00:00:00.000Z", status: "pending" },
  { id: "INV-1003", customerName: "Olivia Brown", amount: 450, dueDate: "2025-05-28T00:00:00.000Z", status: "paid" },
  { id: "INV-1004", customerName: "Noah Williams", amount: 90, dueDate: "2025-06-01T00:00:00.000Z", status: "overdue" },
  { id: "INV-1005", customerName: "Ava Thompson", amount: 240, dueDate: "2025-06-25T00:00:00.000Z", status: "sent" },
  { id: "INV-1006", customerName: "Isla Robinson", amount: 325, dueDate: "2025-06-12T00:00:00.000Z", status: "paid" },
  { id: "INV-1007", customerName: "Ethan Davies", amount: 210, dueDate: "2025-05-30T00:00:00.000Z", status: "overdue" },
  { id: "INV-1008", customerName: "Mia Johnson", amount: 65, dueDate: "2025-06-30T00:00:00.000Z", status: "draft" },
  { id: "INV-1009", customerName: "Emma Clarke", amount: 160, dueDate: "2025-06-18T00:00:00.000Z", status: "sent" },
  { id: "INV-1010", customerName: "Olivia Brown", amount: 280, dueDate: "2025-07-05T00:00:00.000Z", status: "pending" },
];

export const payments = [
  { id: "PAY-2001", customerName: "Emma Clarke", amount: 185, method: "Card", date: "2025-05-09T00:00:00.000Z", status: "paid" },
  { id: "PAY-2002", customerName: "Olivia Brown", amount: 450, method: "Bank transfer", date: "2025-05-27T00:00:00.000Z", status: "paid" },
  { id: "PAY-2003", customerName: "Isla Robinson", amount: 325, method: "Card", date: "2025-06-11T00:00:00.000Z", status: "paid" },
  { id: "PAY-2004", customerName: "Mia Johnson", amount: 75, method: "Cash", date: "2025-06-02T00:00:00.000Z", status: "paid" },
  { id: "PAY-2005", customerName: "Liam Patel", amount: 60, method: "Card", date: "2025-06-06T00:00:00.000Z", status: "paid" },
  { id: "PAY-2006", customerName: "Ava Thompson", amount: 140, method: "Bank transfer", date: "2025-06-08T00:00:00.000Z", status: "paid" },
  { id: "PAY-2007", customerName: "Emma Clarke", amount: 160, method: "Cash", date: "2025-06-13T00:00:00.000Z", status: "paid" },
  { id: "PAY-2008", customerName: "Noah Williams", amount: 40, method: "Card", date: "2025-06-14T00:00:00.000Z", status: "paid" },
];

export const reminders = [
  { id: "REM-01", customerName: "Noah Williams", invoiceId: "INV-1004", amount: 90, dueDate: "2025-06-01T00:00:00.000Z", channel: "Email", status: "sent" },
  { id: "REM-02", customerName: "Liam Patel", invoiceId: "INV-1002", amount: 120, dueDate: "2025-06-20T00:00:00.000Z", channel: "WhatsApp", status: "scheduled" },
  { id: "REM-03", customerName: "Ethan Davies", invoiceId: "INV-1007", amount: 210, dueDate: "2025-05-30T00:00:00.000Z", channel: "SMS", status: "sent" },
  { id: "REM-04", customerName: "Ava Thompson", invoiceId: "INV-1005", amount: 240, dueDate: "2025-06-25T00:00:00.000Z", channel: "Email", status: "scheduled" },
  { id: "REM-05", customerName: "Emma Clarke", invoiceId: "INV-1009", amount: 160, dueDate: "2025-06-18T00:00:00.000Z", channel: "SMS", status: "pending" },
  { id: "REM-06", customerName: "Olivia Brown", invoiceId: "INV-1010", amount: 280, dueDate: "2025-07-05T00:00:00.000Z", channel: "WhatsApp", status: "pending" },
];

export const expenses = [
  { id: "EXP-01", description: "Studio rent – June", category: "Rent", amount: 1200, date: "2025-06-01T00:00:00.000Z" },
  { id: "EXP-02", description: "Hair & nail product restock", category: "Products", amount: 486.5, date: "2025-06-03T00:00:00.000Z" },
  { id: "EXP-03", description: "Electricity bill", category: "Utilities", amount: 142.8, date: "2025-06-05T00:00:00.000Z" },
  { id: "EXP-04", description: "Instagram ads", category: "Marketing", amount: 150, date: "2025-06-07T00:00:00.000Z" },
  { id: "EXP-05", description: "Stylist commission – May", category: "Staff", amount: 1850, date: "2025-06-01T00:00:00.000Z" },
  { id: "EXP-06", description: "Water & broadband", category: "Utilities", amount: 74.99, date: "2025-06-09T00:00:00.000Z" },
  { id: "EXP-07", description: "Replacement styling chair", category: "Equipment", amount: 395, date: "2025-05-18T00:00:00.000Z" },
  { id: "EXP-08", description: "Google Business promotion", category: "Marketing", amount: 80, date: "2025-05-22T00:00:00.000Z" },
  { id: "EXP-09", description: "Colour products restock", category: "Products", amount: 312.4, date: "2025-05-14T00:00:00.000Z" },
  { id: "EXP-10", description: "Receptionist wages – May", category: "Staff", amount: 920, date: "2025-05-31T00:00:00.000Z" },
];

export const monthlyRevenue = [
  { month: "Jan", revenue: 8200, expenses: 5400 },
  { month: "Feb", revenue: 7600, expenses: 5100 },
  { month: "Mar", revenue: 9100, expenses: 5600 },
  { month: "Apr", revenue: 8800, expenses: 5550 },
  { month: "May", revenue: 9650, expenses: 5900 },
  { month: "Jun", revenue: 10250, expenses: 6100 },
];

export const cashFlowForecast = [
  { label: "Wk 1", inflow: 2450, outflow: 1900, balance: 12400 },
  { label: "Wk 2", inflow: 2300, outflow: 2100, balance: 12600 },
  { label: "Wk 3", inflow: 2650, outflow: 1750, balance: 13500 },
  { label: "Wk 4", inflow: 2800, outflow: 3100, balance: 13200 },
  { label: "Wk 5", inflow: 2550, outflow: 1950, balance: 13800 },
  { label: "Wk 6", inflow: 2400, outflow: 2000, balance: 14200 },
  { label: "Wk 7", inflow: 2900, outflow: 2250, balance: 14850 },
  { label: "Wk 8", inflow: 2100, outflow: 3400, balance: 13550 },
  { label: "Wk 9", inflow: 2700, outflow: 1850, balance: 14400 },
  { label: "Wk 10", inflow: 2600, outflow: 2050, balance: 14950 },
  { label: "Wk 11", inflow: 2950, outflow: 2300, balance: 15600 },
  { label: "Wk 12", inflow: 2500, outflow: 1900, balance: 16200 },
  { label: "Wk 13", inflow: 2750, outflow: 2600, balance: 16350 },
];
