import { SUB_FILTER_LABELS, unitsFor, type GroupUnits, type SubFilterKey } from "@/core/subFilter";
import { cn } from "@/utils/cn";

interface SubFilterBarProps {
  /** Filters that have data (from availableSubFilters); fewer than 2 = bar is hidden */
  available: SubFilterKey[];
  value: SubFilterKey;
  units: GroupUnits;
  onChange: (key: SubFilterKey) => void;
}

/** Common sub-filter bar, shown under the report title for every marketplace. */
export function SubFilterBar({ available, value, units, onChange }: SubFilterBarProps) {
  if (available.length < 2) return null;
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Sub-filter</p>
      <div role="group" aria-label="Sub-filter" className="mt-2 flex flex-wrap gap-2">
        {available.map((key) => {
          const active = key === value;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {SUB_FILTER_LABELS[key]}
              <span className={cn("ml-2 whitespace-nowrap text-xs font-medium", active ? "text-indigo-100" : "text-slate-500")}>
                {unitsFor(units, key).toLocaleString("en-IN")} units
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        The cards, graphs and tables below change with the sub-filter. &quot;All&quot; counts every order, including returned and cancelled ones.
      </p>
    </div>
  );
}
