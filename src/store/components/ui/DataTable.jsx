function resolveRowKey(rowKey, row, index) {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (rowKey && row[rowKey] !== undefined) return row[rowKey];
  return index;
}

export function DataTable({ columns, rows, rowKey, emptyText = "No records found" }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left font-semibold ${column.className ?? ""}`.trim()}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-slate-500"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={resolveRowKey(rowKey, row, index)}
                className="transition-smooth hover:bg-slate-50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-navy-900 ${column.className ?? ""}`.trim()}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
