// ---------------------------------------------------------------------------
// Turns the Flipkart Orders / Returns tables into clean lines that all three
// Flipkart reports use.
// ---------------------------------------------------------------------------

import type { ParsedTable } from "../readTable";
import { ReportInputError, parseNumber } from "../amazon/adapter";
import { DateRange, parseDateLoose } from "../amazon/util";
import { FLIPKART_ORDER_COLUMNS, FLIPKART_RETURN_COLUMNS, assertFlipkartColumns } from "./adapter";
import { findColumn } from "../returnFilter";
import type { FlipkartOptions } from "./options";
import { FLIPKART_RETURN_STATUS_HEADINGS } from "./returnStatus";
import type { SkuNames } from "./sku";

export interface FlipkartOrderLine {
  sku: string;
  /** order_item_status in capital letters, e.g. DELIVERED */
  status: string;
  qty: number;
}

export interface FlipkartOrderStats {
  totalRows: number;
  countedRows: number;
  cancelledRows: number;
  cancelledUnits: number;
  dates: DateRange;
  /** every order_item_id in the file (used to find returns of older orders) */
  orderItemIds: Set<string>;
}

export function loadFlipkartOrders(table: ParsedTable, options: FlipkartOptions, names: SkuNames) {
  const cols = assertFlipkartColumns(table, FLIPKART_ORDER_COLUMNS, "Orders");
  const lines: FlipkartOrderLine[] = [];
  const stats: FlipkartOrderStats = {
    totalRows: 0,
    countedRows: 0,
    cancelledRows: 0,
    cancelledUnits: 0,
    dates: new DateRange(),
    orderItemIds: new Set<string>(),
  };

  for (const row of table.rows) {
    const rawSku = row[cols.sku!] ?? "";
    const qty = parseNumber(row[cols.quantity!]);
    if (!rawSku.trim() && qty === 0) continue; // blank line

    stats.totalRows++;
    const status = (row[cols.orderStatus!] ?? "").trim().toUpperCase() || "(NO STATUS)";
    const id = cols.orderItemId ? (row[cols.orderItemId] ?? "").trim() : "";
    if (id) stats.orderItemIds.add(id);
    stats.dates.add(parseDateLoose(cols.orderDate ? row[cols.orderDate] : undefined));

    if (/cancel/i.test(status)) {
      stats.cancelledRows++;
      stats.cancelledUnits += qty;
      if (options.excludeCancelled) continue;
    }

    stats.countedRows++;
    lines.push({ sku: names.canon(rawSku), status, qty });
  }

  if (stats.totalRows === 0) {
    throw new ReportInputError(`The Orders file "${table.fileName}" has no order rows.`);
  }
  return { lines, stats };
}

export interface FlipkartReturnLine {
  sku: string;
  qty: number;
  type: string;
  result: string;
  expectation: string;
  orderItemId: string;
  /** Value of the nested "Return status" column; "" while that column is not set up */
  status: string;
}

export interface FlipkartReturnStats {
  totalRows: number;
  countedRows: number;
  cancelledRows: number;
  cancelledUnits: number;
  dates: DateRange;
}

export function loadFlipkartReturns(table: ParsedTable, options: FlipkartOptions, names: SkuNames) {
  const cols = assertFlipkartColumns(table, FLIPKART_RETURN_COLUMNS, "Returns");
  const lines: FlipkartReturnLine[] = [];
  const stats: FlipkartReturnStats = {
    totalRows: 0,
    countedRows: 0,
    cancelledRows: 0,
    cancelledUnits: 0,
    dates: new DateRange(),
  };
  const cell = (row: Record<string, string>, col: string | undefined) => (col ? (row[col] ?? "").trim() : "");
  const statusCol = findColumn(table.headers, FLIPKART_RETURN_STATUS_HEADINGS);

  for (const row of table.rows) {
    const rawSku = row[cols.sku!] ?? "";
    const qty = parseNumber(row[cols.quantity!]);
    if (!rawSku.trim()) continue;

    stats.totalRows++;
    // return_requested_date is empty in many Flipkart files, so fall back to the approval date
    stats.dates.add(parseDateLoose(cell(row, cols.returnRequestedDate) || cell(row, cols.returnApprovalDate)));

    if (/cancel/i.test(cell(row, cols.returnStatus))) {
      stats.cancelledRows++;
      stats.cancelledUnits += qty;
      if (options.excludeCancelledReturns) continue;
    }

    stats.countedRows++;
    lines.push({
      sku: names.canon(rawSku),
      qty,
      type: cell(row, cols.returnType) || "(blank)",
      result: cell(row, cols.returnResult) || "(blank)",
      expectation: cell(row, cols.returnExpectation) || "(blank)",
      orderItemId: cell(row, cols.orderItemId),
      status: statusCol ? cell(row, statusCol) || "(blank)" : "",
    });
  }

  if (stats.totalRows === 0) {
    throw new ReportInputError(`The Returns file "${table.fileName}" has no return rows.`);
  }
  return { lines, stats };
}
