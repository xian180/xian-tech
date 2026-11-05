// ---------------------------------------------------------------------------
// Custom date range ("From" / "To") used after the files are uploaded.
// Dates come from the date picker as "yyyy-mm-dd"; an empty side is open
// (only "From" = that day and later, only "To" = up to that day).
// A row whose date cannot be read is left out while a filter is on.
// ---------------------------------------------------------------------------

import type { ParsedTable, Row } from "./readTable";
import { DateRange, formatDate, parseDateLoose } from "./amazon/util";

export interface DateFilter {
  from: string;
  to: string;
}

export const NO_DATE_FILTER: DateFilter = { from: "", to: "" };

export const isDateFilterOn = (f: DateFilter) => f.from !== "" || f.to !== "";

export function dateInRange(d: Date | null, f: DateFilter): boolean {
  if (!isDateFilterOn(f)) return true;
  if (!d) return false;
  const from = f.from ? parseDateLoose(f.from) : null;
  const to = f.to ? parseDateLoose(f.to) : null;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** "01 Aug 2026 to 15 Aug 2026", "from 01 Aug 2026" or "up to 15 Aug 2026" */
export function describeDateFilter(f: DateFilter): string {
  const from = f.from ? parseDateLoose(f.from) : null;
  const to = f.to ? parseDateLoose(f.to) : null;
  if (from && to) return `${formatDate(from)} to ${formatDate(to)}`;
  if (from) return `from ${formatDate(from)}`;
  if (to) return `up to ${formatDate(to)}`;
  return "all dates";
}

/** Dates in a column, as "01 Aug 2026 to 03 Nov 2026" (null when none can be read). */
export function rowsDateLabel(rows: Row[], dateOf: (row: Row) => string): string | null {
  const range = new DateRange();
  for (const r of rows) range.add(parseDateLoose(dateOf(r)));
  return range.label();
}

/**
 * Keeps only the rows whose date is inside the filter.
 * `kind` is used in the message when nothing is left, e.g. "orders".
 */
export function filterTableRows(
  table: ParsedTable,
  dateOf: (row: Row) => string,
  f: DateFilter,
  kind: string
): ParsedTable {
  if (!isDateFilterOn(f)) return table;
  const rows = table.rows.filter((r) => dateInRange(parseDateLoose(dateOf(r)), f));
  if (rows.length === 0) {
    const have = rowsDateLabel(table.rows, dateOf);
    throw new DateFilterEmptyError(
      `No ${kind} found ${describeDateFilter(f)}.${have ? ` The ${kind} file covers ${have}.` : ""}`
    );
  }
  return { ...table, rows };
}

/** A friendly message that is safe to show: the chosen dates have no rows. */
export class DateFilterEmptyError extends Error {}
