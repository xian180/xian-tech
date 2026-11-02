// ---------------------------------------------------------------------------
// Shared TypeScript types used across the Xian Tech application.
// ---------------------------------------------------------------------------

/** Configuration of a single analytical report, managed by the admin panel. */
export interface ReportConfig {
  /** Unique, URL/identifier-safe key, e.g. "return-report" */
  id: string;
  /** Display name, e.g. "Return Report" */
  name: string;
  /** Short description shown to end users */
  description: string;
  /** Logical filename of the Python script, e.g. "return_report.py" */
  scriptName: string;
  /** The actual Python source code executed by the Pyodide engine */
  pythonCode: string;
  /** Excel column headers that must be present in the uploaded file */
  requiredColumns: string[];
  /** Whether the report is visible to end users on the homepage */
  active: boolean;
  /** Controls the ordering of report cards on the homepage (ascending) */
  displayOrder: number;
  /** ISO timestamp of last update, used for display/debug purposes */
  updatedAt: string;
}

/** A single KPI/summary card returned by a report script. */
export interface ReportSummaryItem {
  label: string;
  value: string | number;
  /** Optional sub-text, e.g. "+4.2% vs last month" */
  helpText?: string;
}

/** A generic data table returned by a report script. */
export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

/** Chart data returned by a report script, rendered generically on the frontend. */
export interface ReportChart {
  type: "bar" | "line" | "pie";
  title: string;
  /** Category labels (x-axis / pie slices) */
  labels: (string | number)[];
  /** One or more numeric series to plot against labels */
  series: {
    name: string;
    data: number[];
  }[];
}

/** The full structured result produced by a report's `run_report()` function. */
export interface ReportResult {
  title: string;
  generatedAt: string;
  summary: ReportSummaryItem[];
  tables: ReportTable[];
  charts: ReportChart[];
  insights: string[];
}

/** Represents the file currently staged for upload on the homepage. */
export interface UploadedFileInfo {
  file: File;
  name: string;
  sizeLabel: string;
  headers: string[];
}

export type ProcessingStage =
  | "idle"
  | "loading-engine"
  | "validating"
  | "running"
  | "done"
  | "error";
