import { PageHeader, Card } from "../components/ui/index.js";

const sections = [
  {
    title: "Getting started",
    steps: [
      "Open Settings and enter your business name, phone and address.",
      "Add your first customer on Customers.",
      "Create an invoice on Invoices.",
      "Record payments as money arrives.",
      "Check the Dashboard.",
    ],
  },
  {
    title: "Customers",
    steps: [
      "Add, edit or delete customers.",
      "Search by name or phone.",
      "Open a profile to see invoices, payments and the pending balance.",
      "Deleting a customer keeps their invoices and payments.",
    ],
  },
  {
    title: "Invoices",
    steps: [
      "Pick a saved customer, then add service lines, discount and optional GST.",
      "Status updates automatically: Draft, Unpaid, Partially Paid, Paid, Overdue.",
      "Print or save as PDF from the invoice page.",
    ],
  },
  {
    title: "Payments",
    steps: [
      "Record a full or partial payment against an open invoice with method, date and reference.",
      "BizFlow blocks overpayments and duplicate entries.",
    ],
  },
  {
    title: "Reminders",
    steps: [
      "Invoices are grouped by how late they are.",
      "Copy Reminder copies the message; Open WhatsApp opens a prefilled chat.",
      "You press send yourself. BizFlow never sends messages.",
      "Mark as Contacted and Schedule Follow-up are logged in the invoice's follow-up history.",
    ],
  },
  {
    title: "Expenses and bills",
    steps: [
      "Record costs by category and mark them paid or unpaid.",
      "Set a repeat (monthly, quarterly, yearly) for recurring bills.",
      "Upcoming Bills lists unpaid bills with days remaining.",
    ],
  },
  {
    title: "Cash flow forecast",
    steps: [
      "A 30, 60 or 90-day projection from your opening cash, expected payments and bills.",
      "It uses calculations, not predictions.",
      "It shows the weeks and days where cash may run short.",
    ],
  },
  {
    title: "What-If Simulator",
    steps: [
      "Pick an unpaid invoice and test a 7, 15 or 30-day late payment.",
      "It works on a temporary copy; your invoices and payments are never changed.",
    ],
  },
  {
    title: "Smart Action Center",
    steps: [
      "Tasks are ranked Urgent, High priority and Normal.",
      "Each task has a button that opens the right page.",
    ],
  },
  {
    title: "Reports",
    steps: [
      "Seven reports for today, this week, this month, last month or a custom range.",
      "Each report can be downloaded as CSV.",
    ],
  },
  {
    title: "Settings and your data",
    steps: [
      "Back up everything as JSON, or restore from a backup.",
      "Export invoices, payments or expenses as CSV.",
      "Load sample data, or clear all data.",
      "All data stays in this browser; export a backup regularly.",
    ],
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="How BizFlow works"
        description="A quick guide to every part of your back office."
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Card>
        ))}

      </div>
    </div>
  );
}
