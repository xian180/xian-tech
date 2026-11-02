import type { ReportSummaryItem } from "@/types";

export function SummaryCards({ items }: { items: ReportSummaryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-1.5 text-xl font-semibold text-slate-900 sm:text-2xl">{item.value}</p>
          {item.helpText && <p className="mt-1 text-xs text-slate-400">{item.helpText}</p>}
        </div>
      ))}
    </div>
  );
}
