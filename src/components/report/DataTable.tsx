import type { ReportTable } from "@/types";

export function DataTable({ table }: { table: ReportTable }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-slate-800">{table.title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {table.columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length} className="px-3 py-4 text-center text-sm text-slate-400">
                  No data available.
                </td>
              </tr>
            ) : (
              table.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {typeof cell === "number" ? cell.toLocaleString("en-IN") : cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
