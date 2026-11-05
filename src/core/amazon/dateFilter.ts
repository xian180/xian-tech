// Date range for the Amazon files: Orders by purchase-date, Returns by Return request date.

import type { ParsedTable } from "../readTable";
import { DateFilter, filterTableRows, isDateFilterOn, rowsDateLabel } from "../dateFilter";
import { ORDER_COLUMNS, RETURN_COLUMNS, ReportInputError, assertColumns } from "./adapter";

export function filterAmazonOrders(table: ParsedTable, f: DateFilter): ParsedTable {
  if (!isDateFilterOn(f)) return table;
  const col = assertColumns(table, ORDER_COLUMNS, "Orders").purchaseDate;
  if (!col) throw new ReportInputError("The Orders file has no purchase-date column, so the dates cannot be filtered.");
  return filterTableRows(table, (r) => r[col] ?? "", f, "orders");
}

export function filterAmazonReturns(table: ParsedTable, f: DateFilter): ParsedTable {
  if (!isDateFilterOn(f)) return table;
  const col = assertColumns(table, RETURN_COLUMNS, "Returns").returnDate;
  if (!col) throw new ReportInputError("The Returns file has no Return request date column, so the dates cannot be filtered.");
  return filterTableRows(table, (r) => r[col] ?? "", f, "returns");
}

/** What dates the uploaded files cover, e.g. ["Orders: 01 Aug 2026 to 03 Nov 2026", ...]. */
export function amazonCoverage(orders: ParsedTable, returns: ParsedTable | null): string[] {
  const out: string[] = [];
  const oc = assertColumns(orders, ORDER_COLUMNS, "Orders").purchaseDate;
  const o = oc ? rowsDateLabel(orders.rows, (r) => r[oc] ?? "") : null;
  if (o) out.push(`Orders: ${o}`);
  if (returns) {
    const rc = assertColumns(returns, RETURN_COLUMNS, "Returns").returnDate;
    const r = rc ? rowsDateLabel(returns.rows, (row) => row[rc] ?? "") : null;
    if (r) out.push(`Returns: ${r}`);
  }
  return out;
}
