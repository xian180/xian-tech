// ---------------------------------------------------------------------------
// Excel helper utilities (header validation, sample workbook generation and
// report export) built on top of SheetJS (xlsx). These helpers only ever
// touch structural/header information or render already-computed report
// data — all business calculations happen in Python (see pyodideEngine.ts).
// ---------------------------------------------------------------------------

import * as XLSX from "xlsx";
import type { ReportResult } from "@/types";
import { SAMPLE_TEST_ROWS } from "@/config/defaultReports";

export interface ValidationOutcome {
  valid: boolean;
  missing: string[];
  headers: string[];
}

/** Reads just the header row of the first sheet of an uploaded workbook. */
export async function readWorkbookHeaders(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", sheetRows: 1 });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false });
  const header = rows[0] || [];
  return header.map((h) => String(h ?? "").trim()).filter(Boolean);
}

/** Validates that all required columns are present (case-insensitive, trimmed). */
export function validateColumns(headers: string[], required: string[]): ValidationOutcome {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const missing = required.filter((col) => !normalizedHeaders.includes(col.trim().toLowerCase()));
  return { valid: missing.length === 0, missing, headers };
}

/** Basic file-type/size sanity checks performed before any processing starts. */
export function validateFileBasics(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return "Unsupported file type. Please upload a .xlsx or .xls Excel file.";
  }
  const maxBytes = 25 * 1024 * 1024; // 25 MB
  if (file.size > maxBytes) {
    return "This file is too large (max 25 MB). Please upload a smaller export.";
  }
  if (file.size === 0) {
    return "This file appears to be empty.";
  }
  return null;
}

/** Builds an in-memory sample workbook (used by Admin > Test Script). */
export function buildSampleWorkbookBytes(): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEST_ROWS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out);
}

/** Builds a downloadable blank template containing only the required headers. */
export function downloadTemplate(requiredColumns: string[], reportName: string) {
  const allColumns = Array.from(
    new Set([...requiredColumns, "Order Date", "Marketplace", "SKU", "Cost Price", "Return Reason"])
  );
  const worksheet = XLSX.utils.aoa_to_sheet([allColumns]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  XLSX.writeFile(workbook, `${slugifyFilename(reportName)}-template.xlsx`);
}

/** Exports a generated report result as a multi-sheet Excel workbook. */
export function downloadReportAsExcel(result: ReportResult, reportName: string) {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = result.summary.map((s) => ({ Metric: s.label, Value: s.value, Notes: s.helpText || "" }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Metric: "", Value: "", Notes: "" }]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // One sheet per table
  result.tables.forEach((table, idx) => {
    const rows = table.rows.map((row) => Object.fromEntries(table.columns.map((c, i) => [c, row[i] ?? ""])));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(table.columns.map((c) => [c, ""]))]);
    const sheetName = sanitizeSheetName(table.title || `Table ${idx + 1}`);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  // Insights sheet
  if (result.insights.length) {
    const insightSheet = XLSX.utils.aoa_to_sheet(result.insights.map((i) => [i]));
    XLSX.utils.book_append_sheet(workbook, insightSheet, "Insights");
  }

  XLSX.writeFile(workbook, `${slugifyFilename(reportName)}-${Date.now()}.xlsx`);
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
}

function slugifyFilename(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "report";
}
