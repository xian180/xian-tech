import type { ReportConfig } from "@/types";
import { cn } from "@/utils/cn";
import { downloadTemplate } from "@/lib/excel";

interface ReportSelectorProps {
  reports: ReportConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ReportSelector({ reports, selectedId, onSelect, disabled }: ReportSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">2. Choose the report you need</h2>
      <p className="mt-1 text-sm text-slate-500">
        Each report runs its own dedicated analysis script on your uploaded data.
      </p>

      {reports.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No reports are currently available. Please check back soon.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {reports.map((report) => {
            const active = report.id === selectedId;
            return (
              <div
                key={report.id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                onClick={() => !disabled && onSelect(report.id)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(report.id);
                  }
                }}
                className={cn(
                  "flex cursor-pointer flex-col rounded-2xl border px-4 py-4 text-left transition-all",
                  disabled && "cursor-not-allowed opacity-60",
                  active
                    ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{report.name}</p>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      active ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"
                    )}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {report.requiredColumns.slice(0, 4).map((c) => (
                    <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {c}
                    </span>
                  ))}
                  {report.requiredColumns.length > 4 && (
                    <span className="text-[11px] text-slate-400">+{report.requiredColumns.length - 4} more</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate(report.requiredColumns, report.name);
                  }}
                  className="mt-3 self-start text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Download sample template ↓
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
