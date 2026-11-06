import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FileSlot } from "@/components/FileSlot";
import { ReportView } from "@/components/report/ReportView";
import { LoadingPanel, ErrorPanel } from "@/components/StatusPanels";
import { readTableFile, validateFileBasics, type ParsedTable } from "@/core/readTable";
import { DateRangeBar } from "@/components/DateRangeBar";
import { NO_DATE_FILTER, type DateFilter } from "@/core/dateFilter";
import { amazonCoverage, filterAmazonOrders, filterAmazonReturns } from "@/core/amazon/dateFilter";
import { buildSalesReport } from "@/core/amazon/salesReport";
import { buildReturnRatio } from "@/core/amazon/returnRatio";
import { buildAmazonReturnsReport } from "@/core/amazon/returnsReport";
import { loadAmazonReturns } from "@/core/amazon/returns";
import { ReturnFilterBar } from "@/components/ReturnFilterBar";
import {
  buildReturnFilterInfo,
  NO_RETURN_FILTER,
  type ReturnFilterInfo,
  type ReturnFilterState,
} from "@/core/returnFilter";
import { DEFAULT_OPTIONS, type AmazonOptions } from "@/core/amazon/options";
import { getSampleFiles } from "@/core/samples";
import { cn } from "@/utils/cn";
import type { ReportResult } from "@/types";

type TabKey = "sales" | "returns" | "ratio";

interface ReportBundle {
  sales: ReportResult;
  /** Returns report */
  returns: ReportResult | null;
  /** SKU Return Ratio */
  ratio: ReportResult | null;
  /** Returns (already cut to the chosen dates), kept so the return sub-filter can rebuild the Returns reports alone */
  returnsTable: ParsedTable | null;
  /** Return sub-filter in use (return type + nested return status) and its buttons */
  returnFilter: ReturnFilterState;
  returnFilterInfo: ReturnFilterInfo | null;
  /** Shown when the Returns file was given but could not be used */
  returnsProblem: string | null;
  /** Time taken to read the files and build every report, in milliseconds */
  ms: number;
  orderRows: number;
  returnRows: number;
  sample: boolean;
}

function OptionRow(props: { checked: boolean; onChange: (v: boolean) => void; title: string; help: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{props.title}</span>
        <span className="block text-xs text-slate-500">{props.help}</span>
      </span>
    </label>
  );
}

/** 0.0042 s -> "under 0.01 seconds", 0.42 s -> "0.42 seconds", 2.5 s -> "2.5 seconds" */
function formatSeconds(ms: number): string {
  const s = ms / 1000;
  if (s < 0.01) return "under 0.01 seconds";
  if (s < 10) return `${s.toFixed(2)} seconds`;
  return `${s.toFixed(1)} seconds`;
}

function SpeedBanner({ bundle }: { bundle: ReportBundle }) {
  const count = 1 + (bundle.returns ? 1 : 0) + (bundle.ratio ? 1 : 0);
  const rows = bundle.returns
    ? `${bundle.orderRows.toLocaleString("en-IN")} order rows + ${bundle.returnRows.toLocaleString("en-IN")} return rows`
    : `${bundle.orderRows.toLocaleString("en-IN")} order rows`;
  return (
    <div
      id="speed-banner"
      className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-5 text-white shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl">⚡</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50">
            {count === 1 ? "Your report is ready in" : `All ${count} reports ready in`}
          </p>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">{formatSeconds(bundle.ms)}</p>
        </div>
        <p className="min-w-[14rem] flex-1 text-sm text-emerald-50 sm:text-right">
          {rows} turned into {count === 1 ? "a ready dashboard" : "ready dashboards"} with Excel and PDF downloads, calculated on your own device.
        </p>
      </div>
      {bundle.sample && (
        <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-xs text-white">
          This is dummy sample data. Upload your own Amazon files above to see your real numbers.
        </p>
      )}
    </div>
  );
}

/** Everything read from the uploaded files, kept so the dates can be changed without reading the files again. */
interface Inputs {
  ordersTable: ParsedTable;
  returnsTable: ParsedTable | null;
  returnsReadProblem: string | null;
  sample: boolean;
  coverage: string[];
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Builds every report that is possible from the read files, for the chosen dates. */
function buildBundle(
  inputs: Inputs,
  options: AmazonOptions,
  filter: DateFilter,
  ms: number,
  returnFilter: ReturnFilterState = NO_RETURN_FILTER
): ReportBundle {
  const ordersTable = filterAmazonOrders(inputs.ordersTable, filter); // nothing left = message for the person
  const sales = buildSalesReport(ordersTable, options);

  let returnsReport: ReportResult | null = null;
  let ratioReport: ReportResult | null = null;
  let returnsTableUsed: ParsedTable | null = null;
  let returnFilterInfo: ReturnFilterInfo | null = null;
  let returnsProblem: string | null = inputs.returnsReadProblem;
  let returnRows = 0;
  if (inputs.returnsTable && !returnsProblem) {
    try {
      const returnsTable = filterAmazonReturns(inputs.returnsTable, filter);
      returnRows = returnsTable.rows.length;
      returnsTableUsed = returnsTable;
      returnFilterInfo = buildReturnFilterInfo(loadAmazonReturns(returnsTable, options).lines, returnFilter);
      returnsReport = buildAmazonReturnsReport(returnsTable, options, returnFilterInfo.state);
      ratioReport = buildReturnRatio(ordersTable, returnsTable, options, returnFilterInfo.state);
    } catch (e) {
      returnsReport = null;
      ratioReport = null;
      returnsTableUsed = null;
      returnFilterInfo = null;
      returnsProblem = errorText(e, "The Returns file could not be read.");
    }
  }
  return {
    sales,
    returns: returnsReport,
    ratio: ratioReport,
    returnsTable: returnsTableUsed,
    returnFilter: returnFilterInfo?.state ?? NO_RETURN_FILTER,
    returnFilterInfo,
    returnsProblem,
    ms,
    orderRows: ordersTable.rows.length,
    returnRows,
    sample: inputs.sample,
  };
}

export function AmazonReports() {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [returnsFile, setReturnsFile] = useState<File | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [options, setOptions] = useState<AmazonOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [tab, setTab] = useState<TabKey>("sales");
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>(NO_DATE_FILTER);
  const [dateError, setDateError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  /** Scroll to the reports only after "Generate" (not when the sub-filter or dates change) */
  const scrollToResult = useRef(false);

  useEffect(() => {
    if (bundle && scrollToResult.current) {
      scrollToResult.current = false;
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bundle]);

  function pick(kind: "orders" | "returns", file: File) {
    const problem = validateFileBasics(file);
    setBundle(null);
    setError(null);
    if (kind === "orders") {
      setOrdersError(problem);
      setOrdersFile(problem ? null : file);
    } else {
      setReturnsError(problem);
      setReturnsFile(problem ? null : file);
    }
  }

  /** Reads the files and builds every report that is possible, timing the whole thing. */
  async function runReports(orders: File, returns: File | null, sample: boolean) {
    setError(null);
    setBundle(null);
    setBusy(true);
    setDateFilter(NO_DATE_FILTER);
    setDateError(null);
    const started = performance.now();
    try {
      const ordersTable = await readTableFile(orders);
      let returnsTable: ParsedTable | null = null;
      let returnsReadProblem: string | null = null;
      if (returns) {
        try {
          returnsTable = await readTableFile(returns);
        } catch (e) {
          returnsReadProblem = errorText(e, "The Returns file could not be read.");
        }
      }
      let coverage: string[] = [];
      try {
        coverage = amazonCoverage(ordersTable, returnsTable);
      } catch {
        coverage = [];
      }
      const read: Inputs = { ordersTable, returnsTable, returnsReadProblem, sample, coverage };
      const built = buildBundle(read, options, NO_DATE_FILTER, 0);
      setInputs(read);
      setTab("sales");
      scrollToResult.current = true;
      setBundle({ ...built, ms: performance.now() - started });
    } catch (e) {
      setError(errorText(e, "Something went wrong while reading your files."));
    } finally {
      setBusy(false);
    }
  }

  /** Rebuilds every report for the chosen days, from the files that are already read. */
  function applyDates(next: DateFilter) {
    if (!inputs) return;
    setDateError(null);
    const started = performance.now();
    try {
      // The chosen return sub-filter stays if the new dates still have data for it, otherwise it goes back to All
      const rebuilt = buildBundle(inputs, options, next, 0, bundle?.returnFilter ?? NO_RETURN_FILTER);
      setDateFilter(next);
      setBundle({ ...rebuilt, ms: performance.now() - started });
    } catch (e) {
      // Nothing found for these days: keep the reports that are on screen and say so
      setDateError(errorText(e, "These dates could not be applied."));
    }
  }

  /** Rebuilds only the Returns report and the SKU Return Ratio for the chosen return sub-filter. */
  function changeReturnFilter(next: ReturnFilterState) {
    if (!bundle || !bundle.returnsTable || !inputs) return;
    const info = buildReturnFilterInfo(loadAmazonReturns(bundle.returnsTable, options).lines, next);
    const ordersTable = filterAmazonOrders(inputs.ordersTable, dateFilter);
    setBundle({
      ...bundle,
      returns: buildAmazonReturnsReport(bundle.returnsTable, options, info.state),
      ratio: buildReturnRatio(ordersTable, bundle.returnsTable, options, info.state),
      returnFilter: info.state,
      returnFilterInfo: info,
    });
  }

  function generate() {
    if (!ordersFile) {
      setError("Please upload your Amazon Orders file first.");
      return;
    }
    void runReports(ordersFile, returnsFile, false);
  }

  function trySample() {
    const sample = getSampleFiles();
    setOrdersFile(sample.orders);
    setReturnsFile(sample.returns);
    setOrdersError(null);
    setReturnsError(null);
    void runReports(sample.orders, sample.returns, true);
  }

  const activeReport = bundle
    ? tab === "returns" && bundle.returns
      ? bundle.returns
      : tab === "ratio" && bundle.ratio
        ? bundle.ratio
        : bundle.sales
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Amazon.in - Easy Ship / Seller Fulfilled
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Amazon Seller Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload the reports you downloaded from Amazon Seller Central and get every report in one go, as a clean
              dashboard you can download as Excel or PDF. Your files are processed inside your browser and never uploaded to
              any server.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-10">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">1. Upload your Amazon files</h2>
                  <button
                    type="button"
                    onClick={trySample}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span aria-hidden>✨</span> Try with sample data
                  </button>
                </div>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <FileSlot
                    title="Orders file (required)"
                    hint="Amazon All Orders / Order Report (.txt)"
                    file={ordersFile}
                    error={ordersError}
                    disabled={busy}
                    onFile={(f) => pick("orders", f)}
                    onRemove={() => {
                      setOrdersFile(null);
                      setBundle(null);
                    }}
                  />
                  <FileSlot
                    title="Returns file (optional)"
                    hint="Amazon All Returns report (.tsv). Adds the Returns report and the SKU Return Ratio."
                    file={returnsFile}
                    error={returnsError}
                    disabled={busy}
                    onFile={(f) => pick("returns", f)}
                    onRemove={() => {
                      setReturnsFile(null);
                      setBundle(null);
                    }}
                  />
                </div>
                <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-700">Where do I download these from Amazon?</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    <li>Orders: Seller Central &rarr; Reports &rarr; Fulfillment &rarr; All Orders (or Orders &rarr; Order Reports).</li>
                    <li>Returns: Seller Central &rarr; Reports &rarr; Return Reports &rarr; All Returns.</li>
                    <li>Menu names can differ slightly between seller accounts.</li>
                  </ul>
                </details>
              </section>

              <section>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Options (how orders are counted)</summary>
                  <div className="mt-3 grid gap-3">
                    <OptionRow
                      checked={options.excludeCancelled}
                      disabled={busy}
                      onChange={(v) => setOptions({ ...options, excludeCancelled: v })}
                      title="Leave out cancelled orders"
                      help="Cancelled orders are not counted in units or revenue. Recommended."
                    />
                    <OptionRow
                      checked={options.excludeReturnedToSeller}
                      disabled={busy}
                      onChange={(v) => setOptions({ ...options, excludeReturnedToSeller: v })}
                      title='Leave out orders with status "Returned to Seller"'
                      help="Off by default, so these orders are counted as sales."
                    />
                    <OptionRow
                      checked={options.excludeRejectedReturns}
                      disabled={busy}
                      onChange={(v) => setOptions({ ...options, excludeRejectedReturns: v })}
                      title='Leave out returns marked "Rejected" (Returns report and Return Ratio)'
                      help="Off by default, so rejected returns are counted."
                    />
                  </div>
                </details>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-900">2. Generate all reports</h2>
                <button
                  type="button"
                  onClick={generate}
                  disabled={busy || !ordersFile}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  {busy ? "Generating..." : "Generate All Reports"}
                </button>
              </section>

              {busy && <LoadingPanel message="Reading your files..." />}
              {!busy && error && <ErrorPanel message={error} />}
            </div>
          </div>
        </div>

        <div ref={resultRef} className="mt-8 scroll-mt-24">
          {!busy && bundle && activeReport && (
            <div className="space-y-6">
              <SpeedBanner bundle={bundle} />

              {inputs && (
                <DateRangeBar
                  applied={dateFilter}
                  busy={busy}
                  coverage={inputs.coverage}
                  error={dateError}
                  onApply={applyDates}
                  note="Orders are picked by purchase date and Returns by return request date. SKU Return Ratio compares the orders placed in these days with the returns made in these days."
                />
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div role="tablist" className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "sales"}
                    onClick={() => setTab("sales")}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-semibold transition",
                      tab === "sales" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    SKU &amp; State Sales Report
                  </button>
                  {bundle.returns && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === "returns"}
                      onClick={() => setTab("returns")}
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm font-semibold transition",
                        tab === "returns" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Returns Report
                    </button>
                  )}
                  {bundle.ratio && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === "ratio"}
                      onClick={() => setTab("ratio")}
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm font-semibold transition",
                        tab === "ratio" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      SKU Return Ratio
                    </button>
                  )}
                </div>
                {!bundle.returns && !bundle.returnsProblem && (
                  <p className="text-xs text-slate-500">Add your Returns file above to also get the Returns report and the SKU Return Ratio.</p>
                )}
              </div>

              {bundle.returnsProblem && <ErrorPanel message={`The Returns reports could not be built. ${bundle.returnsProblem}`} />}

              <ReportView
                result={activeReport}
                afterInsights={
                  (tab === "returns" || tab === "ratio") && bundle.returnFilterInfo ? (
                    <ReturnFilterBar info={bundle.returnFilterInfo} onChange={changeReturnFilter} />
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
