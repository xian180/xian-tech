import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FileSlot } from "@/components/FileSlot";
import { MultiFileSlot } from "@/components/MultiFileSlot";
import { OptionRow, SpeedBanner } from "@/components/MarketplaceParts";
import { ReportView } from "@/components/report/ReportView";
import { LoadingPanel, ErrorPanel } from "@/components/StatusPanels";
import { readTableFile, validateFileBasics, type ParsedTable } from "@/core/readTable";
import { DateRangeBar } from "@/components/DateRangeBar";
import { SubFilterBar } from "@/components/SubFilterBar";
import { ReturnFilterBar } from "@/components/ReturnFilterBar";
import {
  buildReturnFilterInfo,
  NO_RETURN_FILTER,
  type ReturnFilterInfo,
  type ReturnFilterState,
} from "@/core/returnFilter";
import { EMPTY_GROUP_UNITS, type GroupUnits, type SubFilterKey } from "@/core/subFilter";
import { NO_DATE_FILTER, type DateFilter } from "@/core/dateFilter";
import { filterFlipkartOrders, filterFlipkartReturns, filterPaymentFiles, flipkartCoverage } from "@/core/flipkart/dateFilter";
import { buildFlipkartOrdersView } from "@/core/flipkart/ordersReport";
import { buildFlipkartReturnsReport } from "@/core/flipkart/returnsReport";
import { loadFlipkartReturns } from "@/core/flipkart/load";
import { buildFlipkartReturnRatio } from "@/core/flipkart/returnRatio";
import { buildFlipkartPaymentReport, readFlipkartPaymentFile, type PaymentFile } from "@/core/flipkart/payments";
import { buildFlipkartTaxAdsReport } from "@/core/flipkart/taxAds";
import { DEFAULT_FLIPKART_OPTIONS, type FlipkartOptions } from "@/core/flipkart/options";
import { SkuNames } from "@/core/flipkart/sku";
import { getFlipkartSampleFiles } from "@/core/samples";
import { cn } from "@/utils/cn";
import type { ReportResult } from "@/types";

type TabKey = "orders" | "returns" | "ratio" | "payments" | "taxads";

interface ReportBundle {
  orders: ReportResult;
  /** Orders (already cut to the chosen dates), kept so the sub-filter can rebuild the Orders report alone */
  ordersTable: ParsedTable;
  /** Sub-filter in use, the ones that have data, and the units in each group */
  subFilter: SubFilterKey;
  subFilters: SubFilterKey[];
  groupUnits: GroupUnits;
  /** Returns (already cut to the chosen dates), kept so the return sub-filter can rebuild the Returns reports alone */
  returnsTable: ParsedTable | null;
  /** Return sub-filter in use (return type + nested return status) and its buttons */
  returnFilter: ReturnFilterState;
  returnFilterInfo: ReturnFilterInfo | null;
  returns: ReportResult | null;
  ratio: ReportResult | null;
  payments: ReportResult | null;
  taxAds: ReportResult | null;
  /** Shown when the Returns file was given but could not be used */
  returnsProblem: string | null;
  /** Shown when the payment files were given but could not be used */
  paymentsProblem: string | null;
  paymentRows: number;
  /** Time taken to read the files and build every report, in milliseconds */
  ms: number;
  orderRows: number;
  returnRows: number;
  sample: boolean;
}

/** Everything read from the uploaded files, kept so the dates can be changed without reading the files again. */
interface Inputs {
  ordersTable: ParsedTable;
  returnsTable: ParsedTable | null;
  returnsReadProblem: string | null;
  payments: PaymentFile[] | null;
  paymentsReadProblem: string | null;
  /** One SkuNames for all reports, so a SKU is spelled the same way everywhere */
  names: SkuNames;
  sample: boolean;
  coverage: string[];
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Builds every report that is possible from the read files, for the chosen dates. */
function buildBundle(
  inputs: Inputs,
  options: FlipkartOptions,
  filter: DateFilter,
  ms: number,
  subFilter: SubFilterKey = "all",
  returnFilter: ReturnFilterState = NO_RETURN_FILTER
): ReportBundle {
  const { names } = inputs;
  const ordersTable = filterFlipkartOrders(inputs.ordersTable, filter); // nothing left = message for the person
  const ordersView = buildFlipkartOrdersView(ordersTable, options, names, subFilter);

  let returnsReport: ReportResult | null = null;
  let ratioReport: ReportResult | null = null;
  let returnsProblem: string | null = inputs.returnsReadProblem;
  let returnRows = 0;
  let returnsTableUsed: ParsedTable | null = null;
  let returnFilterInfo: ReturnFilterInfo | null = null;
  if (inputs.returnsTable && !returnsProblem) {
    try {
      const returnsTable = filterFlipkartReturns(inputs.returnsTable, filter);
      returnRows = returnsTable.rows.length;
      returnsTableUsed = returnsTable;
      returnFilterInfo = buildReturnFilterInfo(loadFlipkartReturns(returnsTable, options, names).lines, returnFilter);
      returnsReport = buildFlipkartReturnsReport(returnsTable, options, names, returnFilterInfo.state);
      ratioReport = buildFlipkartReturnRatio(ordersTable, returnsTable, options, names, returnFilterInfo.state);
    } catch (e) {
      returnsReport = null;
      ratioReport = null;
      returnFilterInfo = null;
      returnsTableUsed = null;
      returnsProblem = errorText(e, "The Returns file could not be read.");
    }
  }

  let paymentsReport: ReportResult | null = null;
  let taxAdsReport: ReportResult | null = null;
  let paymentsProblem: string | null = inputs.paymentsReadProblem;
  let paymentRows = 0;
  if (inputs.payments && !paymentsProblem) {
    try {
      const read = filterPaymentFiles(inputs.payments, filter);
      paymentRows = read.reduce((sum, f) => sum + f.lines.length, 0);
      paymentsReport = buildFlipkartPaymentReport(read);
      taxAdsReport = buildFlipkartTaxAdsReport(read);
    } catch (e) {
      paymentsProblem = errorText(e, "The payment files could not be read.");
    }
  }

  return {
    orders: ordersView.report,
    ordersTable,
    subFilter: ordersView.subFilter,
    subFilters: ordersView.available,
    groupUnits: ordersView.groupUnits,
    returnsTable: returnsTableUsed,
    returnFilter: returnFilterInfo?.state ?? NO_RETURN_FILTER,
    returnFilterInfo,
    returns: returnsReport,
    ratio: ratioReport,
    payments: paymentsReport,
    taxAds: taxAdsReport,
    paymentsProblem,
    paymentRows,
    returnsProblem,
    ms,
    orderRows: ordersTable.rows.length,
    returnRows,
    sample: inputs.sample,
  };
}

export function FlipkartReports() {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [returnsFile, setReturnsFile] = useState<File | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [options, setOptions] = useState<FlipkartOptions>(DEFAULT_FLIPKART_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [tab, setTab] = useState<TabKey>("orders");
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

  function addPayments(list: File[]) {
    setBundle(null);
    setError(null);
    const problems: string[] = [];
    const good: File[] = [];
    for (const f of list) {
      const problem = validateFileBasics(f);
      if (problem) problems.push(`${f.name}: ${problem}`);
      else if (!/\.xlsx?$/i.test(f.name)) problems.push(`${f.name}: the payment report must be an Excel file (.xlsx or .xls).`);
      else good.push(f);
    }
    setPaymentError(problems.length > 0 ? problems.join(" ") : null);
    setPaymentFiles((prev) => [...prev, ...good.filter((g) => !prev.some((p) => p.name === g.name && p.size === g.size))]);
  }

  /** Reads the files and builds every report that is possible, timing the whole thing. */
  async function runReports(orders: File, returns: File | null, sample: boolean, payments: File[] = []) {
    setError(null);
    setBundle(null);
    setBusy(true);
    setDateFilter(NO_DATE_FILTER);
    setDateError(null);
    const started = performance.now();
    try {
      const ordersTable = await readTableFile(orders);
      const names = new SkuNames();

      let returnsTable: ParsedTable | null = null;
      let returnsReadProblem: string | null = null;
      if (returns) {
        try {
          returnsTable = await readTableFile(returns);
        } catch (e) {
          returnsReadProblem = errorText(e, "The Returns file could not be read.");
        }
      }

      const read: Inputs = {
        ordersTable,
        returnsTable,
        returnsReadProblem,
        payments: null,
        paymentsReadProblem: null,
        names,
        sample,
        coverage: [],
      };

      // The orders report is built first, so the SKU spelling of the Orders file is the one every report uses
      const firstBundle = buildBundle(read, options, NO_DATE_FILTER, 0);

      if (payments.length > 0) {
        try {
          const files: PaymentFile[] = [];
          for (const f of payments) files.push(await readFlipkartPaymentFile(f, names));
          read.payments = files;
        } catch (e) {
          read.paymentsReadProblem = errorText(e, "The payment files could not be read.");
        }
      }
      try {
        read.coverage = flipkartCoverage(ordersTable, returnsTable, read.payments);
      } catch {
        read.coverage = [];
      }

      const full = read.payments || read.paymentsReadProblem ? buildBundle(read, options, NO_DATE_FILTER, 0) : firstBundle;
      const ms = performance.now() - started;
      setInputs(read);
      setTab("orders");
      scrollToResult.current = true;
      setBundle({ ...full, ms });
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
      // The chosen sub-filter stays if the new dates still have data for it, otherwise it goes back to All
      const rebuilt = buildBundle(inputs, options, next, 0, bundle?.subFilter ?? "all", bundle?.returnFilter ?? NO_RETURN_FILTER);
      setDateFilter(next);
      setBundle({ ...rebuilt, ms: performance.now() - started });
    } catch (e) {
      // Nothing found for these days: keep the reports that are on screen and say so
      setDateError(errorText(e, "These dates could not be applied."));
    }
  }

  /** Rebuilds only the Orders report for the chosen sub-filter (no file is read again). */
  function changeSubFilter(next: SubFilterKey) {
    if (!bundle || !inputs) return;
    const view = buildFlipkartOrdersView(bundle.ordersTable, options, inputs.names, next);
    setBundle({ ...bundle, orders: view.report, subFilter: view.subFilter });
  }

  /** Rebuilds only the Returns report and the SKU Return Ratio for the chosen return sub-filter. */
  function changeReturnFilter(next: ReturnFilterState) {
    if (!bundle || !inputs || !bundle.returnsTable) return;
    const info = buildReturnFilterInfo(loadFlipkartReturns(bundle.returnsTable, options, inputs.names).lines, next);
    setBundle({
      ...bundle,
      returns: buildFlipkartReturnsReport(bundle.returnsTable, options, inputs.names, info.state),
      ratio: buildFlipkartReturnRatio(bundle.ordersTable, bundle.returnsTable, options, inputs.names, info.state),
      returnFilter: info.state,
      returnFilterInfo: info,
    });
  }

  function generate() {
    if (!ordersFile) {
      setError("Please upload your Flipkart Orders file first.");
      return;
    }
    void runReports(ordersFile, returnsFile, false, paymentFiles);
  }

  function trySample() {
    const sample = getFlipkartSampleFiles();
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
        : tab === "payments" && bundle.payments
          ? bundle.payments
          : tab === "taxads" && bundle.taxAds
            ? bundle.taxAds
            : bundle.orders
    : null;
  const reportCount = bundle ? 1 + (bundle.returns ? 1 : 0) + (bundle.ratio ? 1 : 0) + (bundle.payments ? 1 : 0) + (bundle.taxAds ? 1 : 0) : 0;

  const tabClass = (key: TabKey) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-semibold transition",
      tab === key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
    );

  return (
    <div className="min-h-screen bg-slate-200/70">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Flipkart - Seller Hub Orders &amp; Returns
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Flipkart Seller Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload the Orders and Returns reports you downloaded from Flipkart Seller Hub and get every report in one go,
              as a clean dashboard you can download as Excel or PDF. Your files are processed inside your browser and never
              uploaded to any server.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-10">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">1. Upload your Flipkart files</h2>
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
                    hint="Flipkart Orders report (.xlsx or .csv)"
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
                    hint="Flipkart Returns report (.xlsx or .csv). Adds the Returns report and the SKU Return Ratio."
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
                <div className="mt-6">
                  <MultiFileSlot
                    title="Payment files (optional)"
                    hint="Flipkart payment / settlement reports (.xlsx), one file per month. Add as many months as you like to get Revenue by SKU and by month, plus the Tax (TCS, TDS, GST) and Ads summary."
                    files={paymentFiles}
                    error={paymentError}
                    disabled={busy}
                    onFiles={addPayments}
                    onRemove={(i) => {
                      setPaymentFiles((prev) => prev.filter((_, k) => k !== i));
                      setBundle(null);
                    }}
                  />
                </div>
                <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-700">Where do I download these from Flipkart?</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    <li>Orders: Seller Hub &rarr; Orders &rarr; download the Orders report.</li>
                    <li>Returns: Seller Hub &rarr; Returns &rarr; download the Returns report.</li>
                    <li>Payments: Seller Hub &rarr; Payments &rarr; download the payment (settlement) report for each month.</li>
                    <li>The file can keep its extra &quot;Help&quot; sheet; it is skipped automatically.</li>
                    <li>Menu names can differ slightly between seller accounts.</li>
                  </ul>
                </details>
              </section>

              <section>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Options (how returns are counted)</summary>
                  <div className="mt-3 grid gap-3">
                    <OptionRow
                      checked={options.excludeCancelledReturns}
                      disabled={busy}
                      onChange={(v) => setOptions({ ...options, excludeCancelledReturns: v })}
                      title='Leave out returns with status "cancelled"'
                      help="Off by default, so these return lines are counted."
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
              <SpeedBanner
                ms={bundle.ms}
                reportCount={reportCount}
                marketplace="Flipkart"
                sample={bundle.sample}
                rowsLabel={
                  bundle.returns
                    ? `${bundle.orderRows.toLocaleString("en-IN")} order rows + ${bundle.returnRows.toLocaleString("en-IN")} return rows${bundle.paymentRows > 0 ? ` + ${bundle.paymentRows.toLocaleString("en-IN")} payment rows` : ""}`
                    : `${bundle.orderRows.toLocaleString("en-IN")} order rows${bundle.paymentRows > 0 ? ` + ${bundle.paymentRows.toLocaleString("en-IN")} payment rows` : ""}`
                }
              />

              {inputs && (
                <DateRangeBar
                  applied={dateFilter}
                  busy={busy}
                  coverage={inputs.coverage}
                  error={dateError}
                  onApply={applyDates}
                  note="Orders are picked by order date, Returns by return date and Payments (revenue, tax, ads) by payment date. SKU Return Ratio compares the orders placed in these days with the returns made in these days."
                />
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div role="tablist" className="inline-flex flex-wrap rounded-xl border border-slate-300 bg-white p-1">
                  <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")} className={tabClass("orders")}>
                    SKU &amp; Status Orders
                  </button>
                  {bundle.returns && (
                    <button type="button" role="tab" aria-selected={tab === "returns"} onClick={() => setTab("returns")} className={tabClass("returns")}>
                      Returns Report
                    </button>
                  )}
                  {bundle.ratio && (
                    <button type="button" role="tab" aria-selected={tab === "ratio"} onClick={() => setTab("ratio")} className={tabClass("ratio")}>
                      SKU Return Ratio
                    </button>
                  )}
                  {bundle.payments && (
                    <button type="button" role="tab" aria-selected={tab === "payments"} onClick={() => setTab("payments")} className={tabClass("payments")}>
                      Payments &amp; Revenue
                    </button>
                  )}
                  {bundle.taxAds && (
                    <button type="button" role="tab" aria-selected={tab === "taxads"} onClick={() => setTab("taxads")} className={tabClass("taxads")}>
                      Tax &amp; Ads Summary
                    </button>
                  )}
                </div>
                {!bundle.returns && !bundle.returnsProblem && (
                  <p className="text-xs text-slate-600">Add your Returns file above to also get the Returns report and the SKU Return Ratio.</p>
                )}
              </div>

              {bundle.paymentsProblem && <ErrorPanel message={`The Payments report could not be built. ${bundle.paymentsProblem}`} />}
              {bundle.returnsProblem && <ErrorPanel message={`The Returns reports could not be built. ${bundle.returnsProblem}`} />}

              <ReportView
                result={activeReport}
                filters={
                  tab === "orders" ? (
                    <SubFilterBar
                      available={bundle.subFilters}
                      value={bundle.subFilter}
                      units={bundle.groupUnits ?? EMPTY_GROUP_UNITS}
                      onChange={changeSubFilter}
                    />
                  ) : (tab === "returns" || tab === "ratio") && bundle.returnFilterInfo ? (
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
