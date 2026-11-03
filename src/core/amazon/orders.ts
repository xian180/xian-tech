// ---------------------------------------------------------------------------
// Turns an Amazon Orders report into clean "order lines" that both reports use.
// ---------------------------------------------------------------------------

import type { ParsedTable } from "../readTable";
import { ORDER_COLUMNS, ReportInputError, assertColumns, parseNumber } from "./adapter";
import type { AmazonOptions } from "./options";
import { DateRange, parseDateLoose } from "./util";

export interface OrderLine {
  sku: string;
  state: string;
  qty: number;
  price: number;
}

export interface OrderStats {
  totalRows: number;
  countedRows: number;
  cancelledRows: number;
  /** price on cancelled rows (excluded from revenue when excludeCancelled is on) */
  cancelledPrice: number;
  returnedToSellerRows: number;
  returnedToSellerUnits: number;
  dates: DateRange;
}

export function loadOrderLines(table: ParsedTable, options: AmazonOptions) {
  const cols = assertColumns(table, ORDER_COLUMNS, "Orders");
  const lines: OrderLine[] = [];
  const stats: OrderStats = {
    totalRows: 0,
    countedRows: 0,
    cancelledRows: 0,
    cancelledPrice: 0,
    returnedToSellerRows: 0,
    returnedToSellerUnits: 0,
    dates: new DateRange(),
  };

  for (const row of table.rows) {
    const sku = (row[cols.sku!] ?? "").trim();
    const qty = parseNumber(row[cols.quantity!]);
    const price = parseNumber(row[cols.itemPrice!]);
    if (!sku && qty === 0 && price === 0) continue; // blank line

    stats.totalRows++;
    const orderStatus = (cols.orderStatus ? row[cols.orderStatus] : "") ?? "";
    const itemStatus = (cols.itemStatus ? row[cols.itemStatus] : "") ?? "";
    const cancelled = /cancel/i.test(orderStatus) || /cancel/i.test(itemStatus);
    const returnedToSeller = /returned to seller/i.test(orderStatus);
    stats.dates.add(parseDateLoose(cols.purchaseDate ? row[cols.purchaseDate] : undefined));

    if (cancelled) {
      stats.cancelledRows++;
      stats.cancelledPrice += price;
      if (options.excludeCancelled) continue;
    }
    if (returnedToSeller) {
      stats.returnedToSellerRows++;
      stats.returnedToSellerUnits += qty;
      if (options.excludeReturnedToSeller) continue;
    }

    stats.countedRows++;
    lines.push({
      sku: sku || "(blank SKU)",
      state: (row[cols.shipState!] ?? "").trim().toUpperCase() || "(UNKNOWN)",
      qty,
      price,
    });
  }

  if (stats.totalRows === 0) {
    throw new ReportInputError(`The Orders file "${table.fileName}" has no order rows.`);
  }
  return { lines, stats };
}
