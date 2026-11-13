import { AppearanceMenu } from "@/components/AppearanceMenu";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-slate-900">Xian Tech</p>
            <p className="hidden text-xs text-slate-600 sm:block">Marketplace Business Intelligence</p>
          </div>
        </a>
        <nav className="flex items-center gap-2">
          <a
            href="#/amazon"
            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Amazon Reports
          </a>
          <a
            href="#/flipkart"
            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Flipkart Reports
          </a>
          <a
            href="#reports"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block"
          >
            Reports
          </a>
          <a
            href="#how-it-works"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block"
          >
            How it works
          </a>
          <AppearanceMenu />
        </nav>
      </div>
    </header>
  );
}
