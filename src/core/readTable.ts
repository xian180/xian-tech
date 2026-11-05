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

/**
 * Some downloads (Flipkart Orders) store a wrong sheet size in the file, e.g. "A1:AM1"
 * for a sheet that really has thousands of rows, so Excel libraries read only the header.
 * This measures the cells that are really there and fixes the sheet size.
 */
export function fixSheetRange(sheet: XLSX.WorkSheet): void {
  let maxR = -1;
  let maxC = -1;
  for (const key of Object.keys(sheet)) {
    if (key.charCodeAt(0) === 33) continue; // keys starting with "!" are not cells
    const { r, c } = XLSX.utils.decode_cell(key);
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  if (maxR < 0) return;
  const current = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } };
  if (maxR > current.e.r || maxC > current.e.c) {
    sheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(maxR, current.e.r), c: Math.max(maxC, current.e.c) },
    });
  }
}

/** Reads the first sheet / the whole text file into a ParsedTable. */
export async function readTableFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  let matrix: string[][];

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    if (workbook.SheetNames.length === 0) throw new Error("This Excel file has no sheets.");
    // Flipkart downloads have a "Help" sheet first and the data in a later sheet,
    // so skip "Help" and read the sheet with the most rows (the first one on a tie).
    const candidates = workbook.SheetNames.filter((n) => !/^help$/i.test(n.trim()));
    const names = candidates.length > 0 ? candidates : workbook.SheetNames;
    let aoa: unknown[][] = [];
    for (const sheetName of names) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      fixSheetRange(sheet);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
      if (rows.length > aoa.length) aoa = rows;
    }
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
