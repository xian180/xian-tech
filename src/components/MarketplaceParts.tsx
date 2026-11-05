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
        <span className="block text-xs text-slate-600">{props.help}</span>
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
  const chips = [
    reportCount === 1 ? "1 report" : `${reportCount} reports`,
    rowsLabel,
    "Excel + PDF download",
    "Private: runs on your device",
  ];
  return (
    <div
      id="speed-banner"
      className="relative overflow-hidden rounded-2xl border border-emerald-900/30 bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-800 p-5 text-white shadow-lg shadow-emerald-900/20 sm:p-6"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-white/5" />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-md" aria-hidden>
          ⚡
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            {reportCount === 1 ? "Your report is ready in" : `All ${reportCount} reports ready in`}
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{formatSeconds(ms)}</p>
        </div>
        <p className="min-w-[14rem] flex-1 text-sm font-medium leading-relaxed text-emerald-50 sm:text-right">
          {marketplace} files turned into ready dashboards. No manual Excel work, no waiting.
        </p>
      </div>
      <ul className="relative mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <li key={c} className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
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
