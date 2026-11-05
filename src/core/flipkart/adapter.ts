// ---------------------------------------------------------------------------
// Flipkart adapter: which column headings we read from each Flipkart download.
// The report logic is Flipkart-specific only in this file and load.ts.
// ---------------------------------------------------------------------------

import type { ParsedTable } from "../readTable";
import { ReportInputError, resolveColumns, type ColumnSpec } from "../amazon/adapter";

/** Flipkart "Orders" download (sheet "Orders") */
export const FLIPKART_ORDER_COLUMNS: ColumnSpec[] = [
  { key: "sku", label: "sku", aliases: ["sku"], required: true },
  { key: "quantity", label: "quantity", aliases: ["quantity"], required: true },
  { key: "orderStatus", label: "order_item_status", aliases: ["order_item_status", "order item status"], required: true },
  { key: "orderItemId", label: "order_item_id", aliases: ["order_item_id", "order item id"], required: false },
  { key: "orderDate", label: "order_date", aliases: ["order_date", "order date"], required: false },
];

/** Flipkart "Returns" download (sheet "Returns") */
export const FLIPKART_RETURN_COLUMNS: ColumnSpec[] = [
  { key: "sku", label: "sku", aliases: ["sku"], required: true },
  { key: "quantity", label: "quantity", aliases: ["quantity"], required: true },
  { key: "returnType", label: "return_type", aliases: ["return_type", "return type"], required: true },
  { key: "returnResult", label: "return_result", aliases: ["return_result", "return result"], required: true },
  { key: "returnExpectation", label: "return_expectation", aliases: ["return_expectation", "return expectation"], required: true },
  { key: "returnStatus", label: "return_status", aliases: ["return_status", "return status"], required: false },
  { key: "orderItemId", label: "order_item_id", aliases: ["order_item_id", "order item id"], required: false },
  { key: "returnRequestedDate", label: "return_requested_date", aliases: ["return_requested_date"], required: false },
  { key: "returnApprovalDate", label: "return_approval_date", aliases: ["return_approval_date"], required: false },
];

/** Throws a friendly error if the table is not the expected kind of Flipkart report. */
export function assertFlipkartColumns(
  table: ParsedTable,
  specs: ColumnSpec[],
  kind: "Orders" | "Returns"
): Record<string, string | undefined> {
  const { map, missing } = resolveColumns(table.headers, specs);
  if (missing.length === 0) return map;

  const otherSpecs = kind === "Orders" ? FLIPKART_RETURN_COLUMNS : FLIPKART_ORDER_COLUMNS;
  const looksLikeOther = resolveColumns(table.headers, otherSpecs).missing.length === 0;
  const hint = looksLikeOther
    ? ` This looks like the ${kind === "Orders" ? "Returns" : "Orders"} report - it may be in the wrong box.`
    : "";
  throw new ReportInputError(
    `The ${kind} file "${table.fileName}" is missing required column(s): ${missing.join(", ")}.${hint}`
  );
}
