// Shared helpers for the report builders.

import type { ReportChart } from "../../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses "2025-12-28T20:20:53+00:00" or "28-Dec-2025" (date part only). */
export function parseDateLoose(value: string | undefined): Date | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const dmy = /^(\d{1,2})-([A-Za-z]{3})[a-z]*-(\d{4})/.exec(value);
  if (dmy) {
    const m = MONTHS.findIndex((x) => x.toLowerCase() === dmy[2].toLowerCase());
    if (m >= 0) return new Date(Date.UTC(+dmy[3], m, +dmy[1]));
  }
  return null;
}

export function formatDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export class DateRange {
  min: Date | null = null;
  max: Date | null = null;
  add(d: Date | null) {
    if (!d) return;
    if (!this.min || d < this.min) this.min = d;
    if (!this.max || d > this.max) this.max = d;
  }
  label(): string | null {
    if (!this.min || !this.max) return null;
    return `${formatDate(this.min)} to ${formatDate(this.max)}`;
  }
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const inr = (n: number) => `₹${round2(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (n: number) => n.toLocaleString("en-IN");

/** Adds `value` to the running total stored under `key`. */
export function addTo(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

/** Sorted high -> low; ties are broken alphabetically so output is stable. */
export function sortDesc(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function barChart(title: string, seriesName: string, entries: [string, number][], topN = 10): ReportChart {
  const top = entries.slice(0, topN);
  return {
    type: "bar",
    title,
    labels: top.map(([k]) => k),
    series: [{ name: seriesName, data: top.map(([, v]) => round2(v)) }],
  };
}

/** Top N entries plus one "Others" slice for everything else (used by donut charts). */
export function topWithOthers(entries: [string, number][], keep = 6): [string, number][] {
  const top = entries.slice(0, keep);
  const rest = entries.slice(keep).reduce((s, [, v]) => s + v, 0);
  return rest > 0 ? [...top, ["Others", rest]] : top;
}
