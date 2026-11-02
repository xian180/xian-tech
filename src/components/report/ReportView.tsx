import type { ReportResult } from "@/types";
import { SummaryCards } from "./SummaryCards";
import { DataTable } from "./DataTable";
import { ChartBlock } from "./ChartBlock";
import { downloadReportAsExcel } from "@/lib/excel";

export function ReportView({ result }: { result: ReportResult }) {
  return (
    <div id="report-output" className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{result.title}</h2>
          <p className="text-xs text-slate-400">Generated {new Date(result.generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadReportAsExcel(result, result.title)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <SummaryCards items={result.summary} />

      {result.insights.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <h3 className="text-sm font-semibold text-indigo-900">Key Insights</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-indigo-800">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.charts.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {result.charts.map((chart, i) => (
            <ChartBlock key={i} chart={chart} />
          ))}
        </div>
      )}

      {result.tables.length > 0 && (
        <div className="space-y-5">
          {result.tables.map((table, i) => (
            <DataTable key={i} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}
