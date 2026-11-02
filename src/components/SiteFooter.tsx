export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Xian Tech. All rights reserved.</p>
        <p className="text-xs">Built for e-commerce sellers on Amazon, Flipkart, AJIO, Meesho &amp; Myntra.</p>
      </div>
    </footer>
  );
}
