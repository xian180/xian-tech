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

export function SpeedBanner(props: { ms: number; reportCount: number; rowsLabel: string; sample: boolean; marketplace: string }) {
  const { ms, reportCount, rowsLabel, sample, marketplace } = props;
  return (
    <div
      id="speed-banner"
      className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-5 text-white shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl">⚡</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50">
            {reportCount === 1 ? "Your report is ready in" : `All ${reportCount} reports ready in`}
          </p>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">{formatSeconds(ms)}</p>
        </div>
        <p className="min-w-[14rem] flex-1 text-sm text-emerald-50 sm:text-right">
          {rowsLabel} turned into {reportCount === 1 ? "a ready dashboard" : "ready dashboards"} with Excel and PDF downloads, calculated on your own device.
        </p>
      </div>
      {sample && (
        <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-xs text-white">
          This is dummy sample data. Upload your own {marketplace} files above to see your real numbers.
        </p>
      )}
    </div>
  );
}
