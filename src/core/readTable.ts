// ---------------------------------------------------------------------------
// Reads an uploaded marketplace report (.txt, .tsv, .csv, .xlsx, .xls) into a
// uniform table: trimmed headers + rows keyed by header. Everything happens in
// the browser; the file is never uploaded anywhere.
// ---------------------------------------------------------------------------

import * as XLSX from "xlsx";
import { parseDelimited } from "./delimited";

export type Row = Record<string, string>;

export interface ParsedTable {
  fileName: string;
  headers: string[];
  rows: Row[];
}

export const ACCEPTED_EXTENSIONS = [".txt", ".tsv", ".csv", ".xlsx", ".xls"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/** Quick sanity checks before reading a file. Returns an error message or null. */
export function validateFileBasics(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `Unsupported file type. Please upload one of: ${ACCEPTED_EXTENSIONS.join(", ")}.`;
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_BYTES) return "This file is too large (max 25 MB).";
  return null;
}

/** Reads the first sheet / the whole text file into a ParsedTable. */
export async function readTableFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  let matrix: string[][];

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("This Excel file has no sheets.");
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    matrix = aoa.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c))));
  } else {
    matrix = parseDelimited(await file.text());
  }

  if (matrix.length === 0) throw new Error(`"${file.name}" has no data.`);

  const headers = matrix[0].map((h) => h.trim());
  const rows: Row[] = matrix.slice(1).map((cells) => {
    const row: Row = {};
    headers.forEach((h, i) => {
      if (h && !(h in row)) row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });

  return { fileName: file.name, headers, rows };
}
