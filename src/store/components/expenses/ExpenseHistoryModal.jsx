import { Modal } from "../customers/Modal.jsx";
import { expenseHistoryForName } from "../../lib/expenses.js";
import { formatCurrency, formatDate } from "../../lib/format.js";

export function ExpenseHistoryModal({ open, name, expenses, onClose }) {
  const rows = expenseHistoryForName(expenses || [], name || "");

  return (
    <Modal
      open={open}
      title={"History: " + (name || "")}
      description="All recorded expenses with this name."
      onClose={onClose}
      size="lg"
    >
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No history for this expense yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="px-3 py-2 font-medium">Expense date</th>
                <th className="px-3 py-2 font-medium">Due date</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Method</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr key={expense.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{formatDate(expense.expenseDate)}</td>
                  <td className="px-3 py-2">{formatDate(expense.dueDate)}</td>
                  <td className="px-3 py-2">{formatCurrency(expense.amount)}</td>
                  <td className="px-3 py-2">{expense.status === "paid" ? "Paid" : "Unpaid"}</td>
                  <td className="px-3 py-2">{expense.paymentMethod || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
