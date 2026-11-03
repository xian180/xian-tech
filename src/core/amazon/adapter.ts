// ---------------------------------------------------------------------------
// Amazon.in adapter: which column headings we read from each Amazon report.
// To support another marketplace later, add a new adapter with its own
// headings; the report logic itself does not change.
// ---------------------------------------------------------------------------

import type { ParsedTable } from "../readTable";

export interface ColumnSpec {
  key: string;
  /** Name shown in error messages */
  label: string;
  /** Accepted headings (case/space-insensitive) */
  aliases: string[];
  required: boolean;
}

/** Amazon "All Orders" / "Order Report" (tab-separated .txt) */
export const ORDER_COLUMNS: ColumnSpec[] = [
  { key: "sku", label: "sku", aliases: ["sku", "seller-sku", "merchant sku"], required: true },
  { key: "quantity", label: "quantity", aliases: ["quantity", "quantity-purchased"], required: true },
  { key: "itemPrice", label: "item-price", aliases: ["item-price"], required: true },
  { key: "shipState", label: "ship-state", aliases: ["ship-state"], required: true },
  { key: "orderStatus", label: "order-status", aliases: ["order-status"], required: false },
  { key: "itemStatus", label: "item-status", aliases: ["item-status"], required: false },
  { key: "purchaseDate", label: "purchase-date", aliases: ["purchase-date"], required: false },
];

/** Amazon "All Returns" report (.tsv) */
export const RETURN_COLUMNS: ColumnSpec[] = [
  { key: "sku", label: "Merchant SKU", aliases: ["merchant sku", "sku", "seller sku"], required: true },
  { key: "returnQty", label: "Return quantity", aliases: ["return quantity", "returned quantity"], required: true },
  { key: "returnType", label: "Return type", aliases: ["return type"], required: false },
  { key: "returnDate", label: "Return request date", aliases: ["return request date"], required: false },
];

export function normHeader(h: string): string {
  return h.replace(/\s+/g, " ").trim().toLowerCase();
}

export interface ResolvedColumns {
  /** key -> actual heading used in the file */
  map: Record<string, string | undefined>;
  /** labels of required columns that were not found */
  missing: string[];
}

export function resolveColumns(headers: string[], specs: ColumnSpec[]): ResolvedColumns {
  const lookup = new Map<string, string>();
  headers.forEach((h) => {
    const n = normHeader(h);
    if (!lookup.has(n)) lookup.set(n, h);
  });
  const map: Record<string, string | undefined> = {};
  const missing: string[] = [];
  for (const spec of specs) {
    const hit = spec.aliases.map(normHeader).find((a) => lookup.has(a));
    map[spec.key] = hit ? lookup.get(hit) : undefined;
    if (!hit && spec.required) missing.push(spec.label);
  }
  return { map, missing };
}

/** Error with a message that is safe to show directly to the user. */
export class ReportInputError extends Error {}

/** Throws a friendly error if the table is not the expected kind of report. */
export function assertColumns(
  table: ParsedTable,
  specs: ColumnSpec[],
  kind: "Orders" | "Returns"
): Record<string, string | undefined> {
  const { map, missing } = resolveColumns(table.headers, specs);
  if (missing.length === 0) return map;

  const otherSpecs = kind === "Orders" ? RETURN_COLUMNS : ORDER_COLUMNS;
  const looksLikeOther = resolveColumns(table.headers, otherSpecs).missing.length === 0;
  const hint = looksLikeOther
    ? ` This looks like the ${kind === "Orders" ? "Returns" : "Orders"} report - it may be in the wrong box.`
    : "";
  throw new ReportInputError(
    `The ${kind} file "${table.fileName}" is missing required column(s): ${missing.join(", ")}.${hint}`
  );
}

/** "1,599.00", "₹ 1599", "" -> number (0 when blank or invalid) */
export function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/rs\.?/gi, "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
