import { useSyncExternalStore } from "react";
import type { ReportConfig } from "@/types";
import { DEFAULT_REPORTS } from "@/config/defaultReports";

// ---------------------------------------------------------------------------
// Report configuration store.
//
// On GitHub Pages there is no server, so report definitions (including the
// Python source of each report) are persisted in the browser's localStorage.
// This keeps the "admin adds a report -> it appears on the homepage
// instantly" workflow fully functional without any backend.
//
// IMPORTANT (see README "Security & Production Notes"): because this data
// lives in the browser, it is only as safe as the device it's edited on.
// For a real multi-admin deployment this store should be swapped for calls
// to a small authenticated backend (see README for a suggested approach)
// while the rest of the app (including this store's public interface) stays
// the same.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "xiantech_reports_v1";
const listeners = new Set<() => void>();

function readFromStorage(): ReportConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDefaults();
    const parsed = JSON.parse(raw) as ReportConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedDefaults();
    return parsed;
  } catch {
    return seedDefaults();
  }
}

function seedDefaults(): ReportConfig[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPORTS));
  return DEFAULT_REPORTS;
}

let cache: ReportConfig[] = readFromStorage();
// `useSyncExternalStore` requires getSnapshot() to return a stable (===) reference
// when nothing has changed, otherwise React re-renders in an infinite loop.
// We therefore derive and cache the sorted "active reports" list once per change,
// instead of creating a new array on every render.
let activeCache: ReportConfig[] = deriveActive(cache);

function deriveActive(reports: ReportConfig[]): ReportConfig[] {
  return reports.filter((r) => r.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

function emitChange() {
  cache = readFromStorage();
  activeCache = deriveActive(cache);
  listeners.forEach((l) => l());
}

function persist(reports: ReportConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  emitChange();
}

// Keep tabs in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) emitChange();
  });
}

export function getAllReports(): ReportConfig[] {
  return cache;
}

export function getActiveReports(): ReportConfig[] {
  return activeCache;
}

export function getReportById(id: string): ReportConfig | undefined {
  return cache.find((r) => r.id === id);
}

export function upsertReport(report: ReportConfig) {
  const reports = [...cache];
  const idx = reports.findIndex((r) => r.id === report.id);
  const toSave = { ...report, updatedAt: new Date().toISOString() };
  if (idx >= 0) reports[idx] = toSave;
  else reports.push(toSave);
  persist(reports);
}

export function deleteReport(id: string) {
  persist(cache.filter((r) => r.id !== id));
}

export function toggleActive(id: string) {
  const reports = cache.map((r) => (r.id === id ? { ...r, active: !r.active, updatedAt: new Date().toISOString() } : r));
  persist(reports);
}

export function resetToDefaults() {
  persist(DEFAULT_REPORTS.map((r) => ({ ...r })));
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** React hook returning a live, auto-updating list of all configured reports. */
export function useAllReports(): ReportConfig[] {
  return useSyncExternalStore(subscribe, getAllReports, getAllReports);
}

/** React hook returning a live, auto-updating list of active reports (for the homepage). */
export function useActiveReports(): ReportConfig[] {
  return useSyncExternalStore(subscribe, getActiveReports, getActiveReports);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `report-${Date.now()}`;
}
