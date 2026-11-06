import type { ReturnFilterInfo, ReturnFilterState } from "@/core/returnFilter";
import { cn } from "@/utils/cn";

interface ReturnFilterBarProps {
  info: ReturnFilterInfo;
  onChange: (state: ReturnFilterState) => void;
}

function Pill(props: { active: boolean; label: string; units: number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.active}
      onClick={props.onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-semibold transition",
        props.active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {props.label}
      <span className={cn("ml-2 whitespace-nowrap text-xs font-medium", props.active ? "text-indigo-100" : "text-slate-400")}>
        {props.units.toLocaleString("en-IN")} units
      </span>
    </button>
  );
}

/**
 * Sub-filter for Returns reports (every marketplace): return type buttons, and
 * under them the nested "Return status" buttons when the data has them.
 */
export function ReturnFilterBar({ info, onChange }: ReturnFilterBarProps) {
  if (info.types.length === 0 && info.statuses.length === 0) return null;
  const { state } = info;
  const statusTotal = info.statuses.reduce((s, c) => s + c.units, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {info.types.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sub-filter (return type)</p>
          <div role="group" aria-label="Return type" className="mt-2 flex flex-wrap gap-2">
            <Pill active={state.type === "all"} label="All" units={info.types.reduce((s, c) => s + c.units, 0)} onClick={() => onChange({ type: "all", status: "all" })} />
            {info.types.map((c) => (
              <Pill
                key={c.value}
                active={state.type === c.value}
                label={c.label}
                units={c.units}
                onClick={() => onChange({ type: c.value, status: "all" })}
              />
            ))}
          </div>
        </>
      )}

      {info.statuses.length > 0 && (
        <div className={cn(info.types.length > 0 && "mt-4 border-l-2 border-indigo-200 pl-4")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Return status</p>
          <div role="group" aria-label="Return status" className="mt-2 flex flex-wrap gap-2">
            <Pill active={state.status === "all"} label="All" units={statusTotal} onClick={() => onChange({ ...state, status: "all" })} />
            {info.statuses.map((c) => (
              <Pill key={c.value} active={state.status === c.value} label={c.label} units={c.units} onClick={() => onChange({ ...state, status: c.value })} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">The tables and graphs below change with the sub-filter. &quot;All&quot; counts every return.</p>
    </div>
  );
}
