import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FileSlot } from "@/components/FileSlot";
import { ReportView } from "@/components/report/ReportView";
import { LoadingPanel, ErrorPanel } from "@/components/StatusPanels";
import { readTableFile, validateFileBasics } from "@/core/readTable";
import { buildSalesReport } from "@/core/amazon/salesReport";
import { buildReturnRatio } from "@/core/amazon/returnRatio";
import { DEFAULT_OPTIONS, type AmazonOptions } from "@/core/amazon/options";
import { cn } from "@/utils/cn";
import type { ReportResult } from "@/types";

type ReportKey = "sales" | "returns";

const REPORTS: { key: ReportKey; name: string; description: string; needsReturns: boolean }[] = [
  {
    key: "sales",
    name: "SKU & State Sales Report",
    description: "Orders and revenue for every SKU and every state. Needs the Orders file only.",
    needsReturns: false,
  },
  {
    key: "returns",
    name: "SKU Return Ratio",
    description: "Returned units divided by units sold, SKU by SKU. Needs the Orders file and the Returns file.",
    needsReturns: true,
  },
];

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

export function AmazonReports() {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [returnsFile, setReturnsFile] = useState<File | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [reportKey, setReportKey] = useState<ReportKey>("sales");
  const [options, setOptions] = useState<AmazonOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = REPORTS.find((r) => r.key === reportKey)!;

  function pick(kind: "orders" | "returns", file: File) {
    const problem = validateFileBasics(file);
    setResult(null);
    setError(null);
    if (kind === "orders") {
      setOrdersError(problem);
      setOrdersFile(problem ? null : file);
    } else {
      setReturnsError(problem);
      setReturnsFile(problem ? null : file);
    }
  }

  async function generate() {
    setError(null);
    setResult(null);
    if (!ordersFile) {
      setError("Please upload your Amazon Orders file first.");
      return;
    }
    if (selected.needsReturns && !returnsFile) {
      setError("The Return Ratio report also needs your Amazon Returns file. Please upload it in box 2.");
      return;
    }
    setBusy(true);
    try {
      const orders = await readTableFile(ordersFile);
      if (selected.key === "sales") {
        setResult(buildSalesReport(orders, options));
      } else {
        const returns = await readTableFile(returnsFile!);
        setResult(buildReturnRatio(orders, returns, options));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while reading your files.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Amazon.in - Easy Ship / Seller Fulfilled
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Amazon Seller Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Upload the reports you downloaded from Amazon Seller Central and get a clean dashboard you can download as
            Excel or PDF. Your files are processed inside your browser and never uploaded to any server.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Upload your Amazon files</h2>
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
                    setResult(null);
                  }}
                />
                <FileSlot
                  title={selected.needsReturns ? "Returns file (required for this report)" : "Returns file (only for Return Ratio)"}
                  hint="Amazon All Returns report (.tsv)"
                  file={returnsFile}
                  error={returnsError}
                  disabled={busy}
                  onFile={(f) => pick("returns", f)}
                  onRemove={() => {
                    setReturnsFile(null);
                    setResult(null);
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
              <h2 className="text-lg font-semibold text-slate-900">2. Choose a report</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {REPORTS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setReportKey(r.key);
                      setResult(null);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      reportKey === r.key ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{r.description}</p>
                  </button>
                ))}
              </div>
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
                    title='Leave out returns marked "Rejected" (Return Ratio only)'
                    help="Off by default, so rejected returns are counted."
                  />
                </div>
              </details>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Generate your report</h2>
              <button
                type="button"
                onClick={generate}
                disabled={busy || !ordersFile}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                {busy ? "Generating..." : "Generate Report"}
              </button>
            </section>

            <div>
              {busy && <LoadingPanel message="Reading your files..." />}
              {!busy && error && <ErrorPanel message={error} />}
              {!busy && result && <ReportView result={result} />}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
