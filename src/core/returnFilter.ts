// ---------------------------------------------------------------------------
// Sub-filter for Returns reports (common for every marketplace).
//   Level 1: return type   (Amazon "Return type", Flipkart return_type).
//            Buttons are made from the values found in the file.
//   Level 2: "Return status" (nested). Its column is NOT fixed yet, so every
//            marketplace has an empty list of accepted headings
//            (see core/amazon/returns.ts and core/flipkart/returnStatus.ts).
//            While that list is empty the nested filter is simply not shown.
// A filter with fewer than 2 choices is never shown.
// ---------------------------------------------------------------------------

import { normHeader } from "./amazon/adapter";
import { num } from "./amazon/util";

export interface ReturnFilterState {
  /** "all" or one return type exactly as it is in the file */
  type: string;
  /** "all" or one return status (only used inside the chosen type) */
  status: string;
}

export const NO_RETURN_FILTER: ReturnFilterState = { type: "all", status: "all" };

/** What every marketplace's return line must have */
export interface ReturnFilterLine {
  qty: number;
  type: string;
  /** "" when the marketplace has no return status column set up */
  status: string;
}

export interface FilterChoice {
  value: string;
  label: string;
  units: number;
}

export interface ReturnFilterInfo {
  /** The filter really in use (a choice that has no data falls back to "all") */
  state: ReturnFilterState;
  /** Return types that have data; empty = type filter not shown */
  types: FilterChoice[];
  /** Return statuses inside the chosen type; empty = nested filter not shown */
  statuses: FilterChoice[];
  /** Units before the filter, and units that stay after it */
  totalUnits: number;
  keptUnits: number;
}

/** First heading of the file that matches one of the accepted headings (ignores case and extra spaces). */
export function findColumn(headers: string[], accepted: string[]): string | undefined {
  if (accepted.length === 0) return undefined;
  const wanted = accepted.map(normHeader);
  return headers.find((h) => wanted.includes(normHeader(h)));
}

/** "courier_return" -> "Courier return" */
export function prettyLabel(value: string): string {
  const t = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.startsWith("(")) return t;
  return t === t.toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function choicesOf(totals: Map<string, number>): FilterChoice[] {
  return [...totals.entries()]
    .filter(([, units]) => units > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([value, units]) => ({ value, label: prettyLabel(value), units }));
}

export function applyReturnFilter<T extends ReturnFilterLine>(lines: T[], state: ReturnFilterState): T[] {
  if (state.type === "all" && state.status === "all") return lines;
  return lines.filter(
    (l) => (state.type === "all" || l.type === state.type) && (state.status === "all" || l.status === state.status)
  );
}

/** Works out the buttons for the data and checks the asked filter is still possible. */
export function buildReturnFilterInfo(lines: ReturnFilterLine[], requested: ReturnFilterState): ReturnFilterInfo {
  const byType = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    byType.set(l.type, (byType.get(l.type) ?? 0) + l.qty);
    totalUnits += l.qty;
  }
  let types = choicesOf(byType);
  if (types.length < 2) types = [];
  const type = types.some((c) => c.value === requested.type) ? requested.type : "all";

  const inType = type === "all" ? lines : lines.filter((l) => l.type === type);
  const byStatus = new Map<string, number>();
  for (const l of inType) {
    if (l.status === "") continue;
    byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + l.qty);
  }
  let statuses = choicesOf(byStatus);
  if (statuses.length < 2) statuses = [];
  const status = statuses.some((c) => c.value === requested.status) ? requested.status : "all";

  const state: ReturnFilterState = { type, status };
  const keptUnits = applyReturnFilter(lines, state).reduce((s, l) => s + l.qty, 0);
  return { state, types, statuses, totalUnits, keptUnits };
}

/** "Courier return" or "Courier return, status Approved"; "" when nothing is filtered. */
export function describeReturnFilter(info: ReturnFilterInfo): string {
  const parts: string[] = [];
  if (info.state.type !== "all") parts.push(prettyLabel(info.state.type));
  if (info.state.status !== "all") parts.push(`status ${prettyLabel(info.state.status)}`);
  return parts.join(", ");
}

export function titleWithReturnFilter(base: string, info: ReturnFilterInfo): string {
  const d = describeReturnFilter(info);
  return d ? `${base} (${d})` : base;
}

/** First insight line when a sub-filter is on (null when it is not). */
export function returnFilterInsight(info: ReturnFilterInfo): string | null {
  const d = describeReturnFilter(info);
  if (!d) return null;
  return `Sub-filter "${d}": ${num(info.keptUnits)} of ${num(info.totalUnits)} returned units are shown.`;
}
