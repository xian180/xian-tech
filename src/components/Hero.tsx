const SUPPORTED_MARKETPLACES = ["Amazon", "Flipkart", "AJIO", "Meesho", "Myntra", "+ more"];

export function Hero() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-indigo-50/60 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            For e-commerce sellers & marketplace brands
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Your Marketplace Data.
            <br className="hidden sm:block" /> Turned Into Business Intelligence.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Upload your Amazon, Flipkart, AJIO, Meesho or Myntra order reports and instantly generate clean,
            professional analytics — sales performance, returns, and profit — without touching a spreadsheet formula.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#/amazon"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Try Amazon Seller Reports
            </a>
            <a
              href="#/flipkart"
              className="inline-flex items-center rounded-xl border border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              Try Flipkart Reports
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Supported marketplaces:</span>
            {SUPPORTED_MARKETPLACES.map((m) => (
              <span key={m} className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
