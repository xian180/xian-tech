import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { UploadSection } from "@/components/UploadSection";
import { ReportSelector } from "@/components/ReportSelector";
import { ReportView } from "@/components/report/ReportView";
import { LoadingPanel, ErrorPanel } from "@/components/StatusPanels";
import { useActiveReports } from "@/store/reportsStore";
import { readWorkbookHeaders, validateColumns, validateFileBasics } from "@/lib/excel";
import { preloadEngine, runReportScript } from "@/lib/pyodideEngine";
import type { ProcessingStage, ReportResult, UploadedFileInfo } from "@/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function Home() {
  const reports = useActiveReports();
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Warm up the Python engine in the background as soon as the page loads.
  useEffect(() => {
    preloadEngine();
  }, []);

  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
    if (selectedReportId && !reports.some((r) => r.id === selectedReportId)) {
      setSelectedReportId(reports[0]?.id ?? null);
    }
  }, [reports, selectedReportId]);

  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedReportId) ?? null, [reports, selectedReportId]);

  const columnCheck = useMemo(() => {
    if (!uploadedFile || !selectedReport) return null;
    return validateColumns(uploadedFile.headers, selectedReport.requiredColumns);
  }, [uploadedFile, selectedReport]);

  async function handleFileChosen(file: File) {
    setResult(null);
    setRunError(null);
    const basicError = validateFileBasics(file);
    if (basicError) {
      setFileError(basicError);
      setUploadedFile(null);
      return;
    }
    try {
      const headers = await readWorkbookHeaders(file);
      if (headers.length === 0) {
        setFileError("We couldn't find any column headers in the first row of this file. Please check the file and try again.");
        setUploadedFile(null);
        return;
      }
      setFileError(null);
      setUploadedFile({ file, name: file.name, sizeLabel: formatSize(file.size), headers });
    } catch {
      setFileError("This file could not be read. Please make sure it is a valid, uncorrupted Excel file.");
      setUploadedFile(null);
    }
  }

  function handleRemoveFile() {
    setUploadedFile(null);
    setFileError(null);
    setResult(null);
    setRunError(null);
  }

  async function handleGenerate() {
    setRunError(null);
    setResult(null);

    if (!uploadedFile) {
      setFileError("Please upload an Excel file before generating a report.");
      return;
    }
    if (!selectedReport) {
      setRunError("Please select a report to generate.");
      return;
    }
    const check = validateColumns(uploadedFile.headers, selectedReport.requiredColumns);
    if (!check.valid) {
      setRunError(
        `This file is missing required column(s) for "${selectedReport.name}": ${check.missing.join(", ")}. ` +
          `Download the sample template below and match your column headers.`
      );
      return;
    }

    try {
      setStage("loading-engine");
      setProgressMessage("Preparing Python engine...");
      const report = await runReportScript(selectedReport.pythonCode, uploadedFile.file, (msg) => {
        setProgressMessage(msg);
        setStage(msg.toLowerCase().includes("running") ? "running" : "loading-engine");
      });
      setResult(report);
      setStage("done");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "An unexpected error occurred while generating the report.");
      setStage("error");
    }
  }

  const isBusy = stage === "loading-engine" || stage === "running";

  return (
    <div className="min-h-screen bg-slate-200/70">
      <SiteHeader />
      <main>
        <Hero />

        <section id="reports" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-10">
              <UploadSection
                uploadedFile={uploadedFile}
                onFileChosen={handleFileChosen}
                onRemove={handleRemoveFile}
                error={fileError}
                disabled={isBusy}
              />

              <ReportSelector reports={reports} selectedId={selectedReportId} onSelect={setSelectedReportId} disabled={isBusy} />

              <div>
                <h2 className="text-lg font-semibold text-slate-900">3. Generate your report</h2>
                {columnCheck && !columnCheck.valid && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Missing required column(s) for <strong>{selectedReport?.name}</strong>: {columnCheck.missing.join(", ")}.
                    Please check your file's headers.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isBusy || !uploadedFile || !selectedReport}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  {isBusy ? "Generating..." : "Generate Report"}
                </button>
              </div>

              <div>
                {isBusy && <LoadingPanel message={progressMessage} />}
                {!isBusy && runError && <ErrorPanel message={runError} />}
                {!isBusy && result && <ReportView result={result} />}
              </div>
            </div>
          </div>
        </section>

        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}
