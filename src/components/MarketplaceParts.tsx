// Small UI pieces shared by marketplace report pages (used by the Flipkart page).

export function OptionRow(props: { checked: boolean; onChange: (v: boolean) => void; title: string; help: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{props.title}</span>
        <span className="block text-xs text-slate-500">{props.help}</span>
      </span>
    </label>
  );
}

/** 0.0042 s -> "under 0.01 seconds", 0.42 s -> "0.42 seconds", 2.5 s -> "2.5 seconds" */
export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  if (s < 0.01) return "under 0.01 seconds";
  if (s < 10) return `${s.toFixed(2)} seconds`;
  return `${s.toFixed(1)} seconds`;
}

function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7" aria-hidden>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M9.5 3h5M12 3v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpeedBanner(props: { ms: number; reportCount: number; rowsLabel: string; sample: boolean; marketplace: string }) {
  const { ms, reportCount, rowsLabel, sample, marketplace } = props;
  const chips = [reportCount === 1 ? "1 report" : `${reportCount} reports`, rowsLabel, "Excel + PDF download", "Private: runs on your device"];
  return (
    <div
      id="speed-banner"
      className="relative overflow-hidden rounded-2xl border border-teal-900/30 bg-teal-800 p-4 text-white shadow-md sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm">
          <StopwatchIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-100">
            {reportCount === 1 ? "Your report is ready in" : `All ${reportCount} reports ready in`}
          </p>
          <p className="tabular text-3xl font-extrabold leading-none tracking-tight sm:text-4xl">{formatSeconds(ms)}</p>
        </div>
        <p className="min-w-[14rem] flex-1 text-sm font-medium text-teal-50 sm:text-right">
          Your {marketplace} files are now a ready dashboard.
        </p>
      </div>
      <ul className="relative mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <li key={c} className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {c}
          </li>
        ))}
      </ul>
      {sample && (
        <p className="relative mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          This is dummy sample data. Upload your own {marketplace} files above to see your real numbers.
        </p>
      )}
    </div>
  );
}
