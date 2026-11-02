export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="max-w-sm text-xs text-slate-400">
        The first run downloads a lightweight Python engine to your browser. This may take a few seconds on slower
        connections — your file never leaves your device.
      </p>
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-6 text-center">
      <p className="text-sm font-semibold text-red-700">We couldn't generate this report</p>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
