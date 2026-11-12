import type { ReactNode } from "react";
import type { ChartColor, ReportSummaryItem } from "@/types";
import { TONES } from "./theme";

type IconName = "rupee" | "box" | "tag" | "pin" | "cancel" | "undo" | "percent" | "chart";

function pickStyle(label: string, index: number): { tone: ChartColor; icon: IconName } {
  const l = label.toLowerCase();
  if (/ratio|percent|%/.test(l)) return { tone: "rose", icon: "percent" };
  if (/cancel/.test(l)) return { tone: "rose", icon: "cancel" };
  if (/return/.test(l)) return { tone: "amber", icon: "undo" };
  if (/revenue|price|amount|sales value/.test(l)) return { tone: "emerald", icon: "rupee" };
  if (/state/.test(l)) return { tone: "sky", icon: "pin" };
  if (/sku/.test(l)) return { tone: "violet", icon: "tag" };
  if (/unit|order|quantity/.test(l)) return { tone: "indigo", icon: "box" };
  const cycle: ChartColor[] = ["indigo", "teal", "violet", "amber", "sky", "emerald"];
  return { tone: cycle[index % cycle.length], icon: "chart" };
}

const ICONS: Record<IconName, ReactNode> = {
  rupee: <path d="M7 5h10M7 9h10M7 5c5 0 7 1.5 7 4s-2 4-7 4l7 6" strokeLinecap="round" strokeLinejoin="round" />,
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" strokeLinejoin="round" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  cancel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </>
  ),
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" strokeLinecap="round" strokeLinejoin="round" />,
  percent: (
    <>
      <path d="M19 5L5 19" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" strokeLinecap="round" strokeLinejoin="round" />,
};

export function SummaryCards({ items }: { items: ReportSummaryItem[] }) {
  if (items.length === 0) return null;
  const layout =
    items.length === 6
      ? "grid-cols-2 lg:grid-cols-3"
      : items.length === 5
        ? "grid-cols-2 lg:grid-cols-5"
        : items.length === 4
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]";
  return (
    <div className={`grid gap-4 ${layout}`}>
      {items.map((item, i) => {
        const { tone, icon } = pickStyle(item.label, i);
        const t = TONES[tone];
        return (
          <div
            key={item.label}
            className="relative overflow-hidden rounded-2xl border-2 p-4 shadow-md"
            style={{ borderColor: t.ring, background: `linear-gradient(180deg, ${t.soft} 0%, #ffffff 75%)` }}
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.main}, ${t.light})` }} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{item.label}</p>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: t.soft, color: t.main }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                  {ICONS[icon]}
                </svg>
              </span>
            </div>
            <p className="tabular mt-2 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.6rem]">{item.value}</p>
            {item.helpText && <p className="mt-1 text-xs text-slate-600">{item.helpText}</p>}
          </div>
        );
      })}
    </div>
  );
}
