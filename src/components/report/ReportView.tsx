import type { ReportResult } from "@/types";
import { SummaryCards } from "./SummaryCards";
import { DataTable } from "./DataTable";
import { ChartBlock } from "./ChartBlock";
import { downloadReportAsExcel } from "@/lib/excel";
import { downloadReportAsPdf } from "@/core/exportPdf";

/** Tailwind needs full class names, so each table count maps to a fixed layout. */
function tableGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 @3xl:grid-cols-2";
  if (count === 3) return "grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3";
  return "grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-4";
}

export function ReportView({ result }: { result: ReportResult }) {
  return (
    <div id="report-output" className="@container space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200">Xian Tech Report</p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">{result.title}</h2>
          <p className="mt-0.5 text-xs text-indigo-200">Generated {new Date(result.generatedAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadReportAsExcel(result, result.title)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => void downloadReportAsPdf(result, result.title)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            Download PDF
          </button>
        </div>
      </div>

      <SummaryCards items={result.summary} />

      {result.insights.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-slate-900">Key Insights</h3>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.charts.length > 0 && (
        <div className="grid gap-5 @3xl:grid-cols-2">
          {result.charts.map((chart, i) => (
            <ChartBlock key={i} chart={chart} />
          ))}
        </div>
      )}

      {result.tables.length > 0 && (
        <div className={`grid items-start gap-5 ${tableGridClass(result.tables.length)}`}>
          {result.tables.map((table, i) => (
            <DataTable key={i} table={table} reportName={result.title} />
          ))}
        </div>
      )}
    </div>
  );
}
