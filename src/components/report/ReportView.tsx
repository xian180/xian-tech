import { useEffect, useState, type ReactNode } from "react";
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

interface ReportViewProps {
  result: ReportResult;
  /** Sub-filter bar, shown right under the report title because it changes every card, graph and table below */
  filters?: ReactNode;
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-1">
      <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

/** Small bar that jumps to a section of a long report; stays visible under the site header while scrolling. */
function JumpNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const idsKey = items.map((i) => i.id).join("|");

  // Highlight the section that is currently on screen.
  useEffect(() => {
    const onScroll = () => {
      let current = idsKey.split("|")[0];
      for (const id of idsKey.split("|")) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h") || "72") + 90) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [idsKey]);

  if (items.length < 3) return null;
  return (
    <nav
      aria-label="Jump to a section"
      className="sticky top-[var(--header-h)] z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-300 bg-white/95 p-1.5 shadow-md backdrop-blur"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => {
            setActive(it.id);
            document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            active === it.id ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export function ReportView({ result, filters }: ReportViewProps) {
  const nav = [
    { id: "rv-summary", label: "Summary", on: result.summary.length > 0 },
    { id: "rv-insights", label: "Key insights", on: result.insights.length > 0 },
    { id: "rv-charts", label: "Graphs", on: result.charts.length > 0 },
    { id: "rv-tables", label: "Tables", on: result.tables.length > 0 },
  ].filter((n) => n.on);
  return (
    <div id="report-output" className="@container space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-700 to-violet-700 p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-100">Xian Tech Report</p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">{result.title}</h2>
          <p className="mt-0.5 text-xs text-indigo-100">Generated {new Date(result.generatedAt).toLocaleString("en-IN")}</p>
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

      {filters}

      <JumpNav items={nav} />

      <section id="rv-summary" className="scroll-mt-[calc(var(--header-h)_+_4.5rem)] space-y-3">
        <SectionHeading title="Summary" hint="The main numbers for this report" />
        <SummaryCards items={result.summary} />
      </section>

      {result.insights.length > 0 && (
        <div id="rv-insights" className="scroll-mt-[calc(var(--header-h)_+_4.5rem)] rounded-2xl border border-slate-300 bg-white p-5 shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-base font-bold tracking-tight text-slate-900">Key insights</h3>
            <p className="text-xs text-slate-600">What stands out in your data</p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{i + 1}</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.charts.length > 0 && (
        <section id="rv-charts" className="scroll-mt-[calc(var(--header-h)_+_4.5rem)] space-y-3">
          <SectionHeading title="Graphs" hint="See the pattern behind the numbers" />
          <div className="grid gap-5 @3xl:grid-cols-2">
            {result.charts.map((chart, i) => (
              <ChartBlock key={i} chart={chart} />
            ))}
          </div>
        </section>
      )}

      {result.tables.length > 0 && (
        <section id="rv-tables" className="scroll-mt-[calc(var(--header-h)_+_4.5rem)] space-y-3">
          <SectionHeading title="Tables" hint="Top rows are shown here; Download has the full list" />
        <div
          className={`grid items-start gap-5 ${
            // Tables with many columns (money breakdowns) need the full width; simple 2-column tables sit side by side.
            result.tables.some((t) => t.columns.length > 3) ? "grid-cols-1" : tableGridClass(result.tables.length)
          }`}
        >
          {result.tables.map((table, i) => (
            <DataTable key={i} table={table} reportName={result.title} />
          ))}
        </div>
        </section>
      )}
    </div>
  );
}
