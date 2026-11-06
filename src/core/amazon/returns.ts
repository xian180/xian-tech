// ---------------------------------------------------------------------------
// Turns an Amazon "All Returns" table into clean return lines that the
// Returns report and the SKU Return Ratio both use.
// ---------------------------------------------------------------------------

import type { ParsedTable } from "../readTable";
import { findColumn } from "../returnFilter";
import { RETURN_COLUMNS, assertColumns, parseNumber } from "./adapter";
import type { AmazonOptions } from "./options";
import { DateRange, parseDateLoose } from "./util";

/**
 * Headings of the Amazon Returns column used for the nested "Return status" filter.
 * NOT fixed yet: while this list is empty the nested filter is not shown.
 * When the column is decided, write its heading here.
 */
export const AMAZON_RETURN_STATUS_HEADINGS: string[] = [];

export interface AmazonReturnLine {
  sku: string;
  qty: number;
  /** Return type exactly as in the file, "(blank)" when empty */
  type: string;
  /** Value of the nested "Return status" column; "" while that column is not set up */
  status: string;
}

export interface AmazonReturnStats {
  totalRows: number;
  countedRows: number;
  rejectedRows: number;
  rejectedUnits: number;
  dates: DateRange;
}

export function loadAmazonReturns(table: ParsedTable, options: AmazonOptions) {
  const cols = assertColumns(table, RETURN_COLUMNS, "Returns");
  const statusCol = findColumn(table.headers, AMAZON_RETURN_STATUS_HEADINGS);
  const lines: AmazonReturnLine[] = [];
  const stats: AmazonReturnStats = { totalRows: 0, countedRows: 0, rejectedRows: 0, rejectedUnits: 0, dates: new DateRange() };

  for (const row of table.rows) {
    const sku = (row[cols.sku!] ?? "").trim();
    const qty = parseNumber(row[cols.returnQty!]);
    if (!sku) continue;

    stats.totalRows++;
    stats.dates.add(parseDateLoose(cols.returnDate ? row[cols.returnDate] : undefined));
    const type = ((cols.returnType ? row[cols.returnType] : "") ?? "").trim();
    if (/rejected/i.test(type)) {
      stats.rejectedRows++;
      stats.rejectedUnits += qty;
      if (options.excludeRejectedReturns) continue;
    }

    stats.countedRows++;
    lines.push({
      sku,
      qty,
      type: type || "(blank)",
      status: statusCol ? (row[statusCol] ?? "").trim() || "(blank)" : "",
    });
  }
  return { lines, stats };
}
