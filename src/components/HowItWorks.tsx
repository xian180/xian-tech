const STEPS = [
  {
    title: "Upload your export",
    body: "Drag and drop the order/return report you downloaded from your marketplace seller panel.",
  },
  {
    title: "Pick a report",
    body: "Choose from Return Report, Sales Report, or any other report your admin has activated.",
  },
  {
    title: "Generate instantly",
    body: "A dedicated Python script analyzes your data securely inside your own browser.",
  },
  {
    title: "Review & download",
    body: "View summary cards, charts and tables, then export the full report as Excel.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-slate-200 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">How Xian Tech works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <p className="mt-3 font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
          Your Excel file is processed locally using Python running in your browser (via WebAssembly). It is never
          uploaded to any server.
        </p>
      </div>
    </section>
  );
}
