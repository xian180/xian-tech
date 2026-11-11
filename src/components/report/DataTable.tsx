import { useEffect, useRef, useState } from "react";
import type { ReportTable } from "@/types";
import { downloadTableAsExcel } from "@/lib/excel";
import { downloadTableAsPdf } from "@/core/exportPdf";
import { formatCell } from "@/core/format";

function DownloadMenu({ table, reportName }: { table: ReportTable; reportName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Download ${table.title}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              downloadTableAsExcel(table, reportName);
              setOpen(false);
            }}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              void downloadTableAsPdf(table, reportName);
              setOpen(false);
            }}
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

export function DataTable({ table, reportName = "report" }: { table: ReportTable; reportName?: string }) {
  const limit = table.previewRows;
  const shown = limit ? table.rows.slice(0, limit) : table.rows;
  const ranked = Boolean(limit);
  const compactTable = table.columns.length <= 2;

  // Light "data bar" behind the last column when it is numeric (top-10 style tables).
  const lastCol = table.columns.length - 1;
  const lastValues = shown.map((r) => r[lastCol]).filter((v): v is number => typeof v === "number");
  const maxLast = lastValues.length ? Math.max(...lastValues) : 0;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-300 bg-white shadow-md">
      <div className="flex min-h-[4rem] items-center justify-between gap-2 rounded-t-2xl border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="min-w-0 text-[13px] font-semibold leading-tight text-slate-900">{table.title}</h3>
        <DownloadMenu table={table} reportName={reportName} />
      </div>

      <div className="overflow-x-auto px-2 py-1">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700">
              {ranked && <th className="w-7 px-2 py-2">#</th>}
              {table.columns.map((col, j) => (
                <th key={col} className={`px-2 py-2 ${j > 0 ? "text-right" : ""}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length + (ranked ? 1 : 0)} className="px-3 py-6 text-center text-slate-500">
                  No data available.
                </td>
              </tr>
            ) : (
              shown.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/60">
                  {ranked && <td className="px-2 py-2 text-slate-500">{i + 1}</td>}
                  {row.map((cell, j) => {
                    const isBarCol = ranked && compactTable && j === lastCol && typeof cell === "number" && maxLast > 0;
                    const pct = isBarCol ? Math.max(4, (Number(cell) / maxLast) * 100) : 0;
                    return (
                      <td
                        key={j}
                        className={`px-2 py-2 ${j === 0 ? "font-medium text-slate-800" : "whitespace-nowrap text-right tabular-nums text-slate-700"}`}
                        style={isBarCol ? { background: `linear-gradient(90deg, transparent ${100 - pct}%, rgba(79,70,229,0.18) ${100 - pct}%)` } : undefined}
                      >
                        {formatCell(cell, table.columnFormats?.[j])}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {limit && table.rows.length > limit && (
        <p className="mt-auto border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-600">
          Showing top {limit} of {table.rows.length.toLocaleString("en-IN")}. Use Download for the full list.
        </p>
      )}
    </div>
  );
}
