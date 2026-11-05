import { useState } from "react";
import { describeDateFilter, isDateFilterOn, type DateFilter } from "@/core/dateFilter";

interface DateRangeBarProps {
  /** The dates the reports are using right now */
  applied: DateFilter;
  busy?: boolean;
  /** What the uploaded files cover, shown as a hint */
  coverage: string[];
  /** Which date each report uses */
  note: string;
  /** Message when the last try found nothing (the old reports stay on screen) */
  error?: string | null;
  onApply: (filter: DateFilter) => void;
}

/** "From" / "To" dates shown after the reports are ready; rebuilds every report for those days only. */
export function DateRangeBar({ applied, busy, coverage, note, error, onApply }: DateRangeBarProps) {
  const [from, setFrom] = useState(applied.from);
  const [to, setTo] = useState(applied.to);
  const [localError, setLocalError] = useState<string | null>(null);
  const on = isDateFilterOn(applied);

  function apply() {
    if (!from && !to) {
      setLocalError("Pick a From date, a To date, or both.");
      return;
    }
    if (from && to && from > to) {
      setLocalError("The From date must not be after the To date.");
      return;
    }
    setLocalError(null);
    onApply({ from, to });
  }

  function reset() {
    setFrom("");
    setTo("");
    setLocalError(null);
    onApply({ from: "", to: "" });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-[10rem] flex-1 sm:flex-none">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="date-from">
            From
          </label>
          <input id="date-from" type="date" value={from} disabled={busy} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div className="min-w-[10rem] flex-1 sm:flex-none">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="date-to">
            To
          </label>
          <input id="date-to" type="date" value={to} disabled={busy} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Apply dates
        </button>
        {on && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Show all dates
          </button>
        )}
      </div>

      {(localError || error) && <p className="mt-3 text-xs font-medium text-red-600">{localError ?? error}</p>}

      <p className="mt-3 text-sm text-slate-700">
        {on ? (
          <>
            Showing <span className="font-semibold text-indigo-700">{describeDateFilter(applied)}</span> only.
          </>
        ) : (
          <>Custom dates: pick the days you want to look at. Right now every date in your files is used.</>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
      {coverage.length > 0 && <p className="mt-1 text-xs text-slate-400">Your files cover - {coverage.join(" | ")}</p>}
    </div>
  );
}
