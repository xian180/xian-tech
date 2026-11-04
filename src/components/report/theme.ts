import type { ChartColor } from "@/types";

/** Colour tones used across the dashboard (all light-theme friendly). */
export const TONES: Record<ChartColor, { main: string; light: string; soft: string; text: string; ring: string }> = {
  indigo: { main: "#4f46e5", light: "#a5b4fc", soft: "#eef2ff", text: "#3730a3", ring: "#c7d2fe" },
  violet: { main: "#7c3aed", light: "#c4b5fd", soft: "#f5f3ff", text: "#5b21b6", ring: "#ddd6fe" },
  teal: { main: "#0d9488", light: "#5eead4", soft: "#f0fdfa", text: "#115e59", ring: "#99f6e4" },
  amber: { main: "#f59e0b", light: "#fcd34d", soft: "#fffbeb", text: "#92400e", ring: "#fde68a" },
  rose: { main: "#e11d48", light: "#fda4af", soft: "#fff1f2", text: "#9f1239", ring: "#fecdd3" },
  sky: { main: "#0284c7", light: "#7dd3fc", soft: "#f0f9ff", text: "#075985", ring: "#bae6fd" },
  emerald: { main: "#059669", light: "#6ee7b7", soft: "#ecfdf5", text: "#065f46", ring: "#a7f3d0" },
};

/** Distinct colours for pie / donut slices and treemap boxes. */
export const SLICE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#e11d48", "#8b5cf6", "#14b8a6", "#f97316", "#64748b", "#ec4899"];

/** 20000 -> "20k", 250000 -> "2.5L", 12000000 -> "1.2Cr" (Indian style). */
export function compact(n: number): string {
  const abs = Math.abs(n);
  const trim = (x: number) => String(Math.round(x * 10) / 10);
  if (abs >= 1e7) return `${trim(n / 1e7)}Cr`;
  if (abs >= 1e5) return `${trim(n / 1e5)}L`;
  if (abs >= 1e3) return `${trim(n / 1e3)}k`;
  return trim(n);
}

export function formatValue(n: number, unit?: string): string {
  const text = n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (unit === "₹") return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit === "%") return `${text}%`;
  return text;
}
