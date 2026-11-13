import { useEffect, useRef, useState } from "react";
import { FONTS, SIZES, THEMES, ensureFontLoaded } from "@/theme/appearance";
import { useAppearance } from "@/theme/ThemeContext";
import { cn } from "@/utils/cn";

function Label({ children }: { children: string }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">{children}</p>;
}

/** "Appearance" button for the header: theme, font and text size, saved in the visitor's browser. */
export function AppearanceMenu() {
  const { theme, font, size, update, reset } = useAppearance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    FONTS.forEach((f) => ensureFontLoaded(f.id)); // so every font name below is drawn in its own font
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
          <path d="M12 3a9 9 0 100 18c1.1 0 1.6-.8 1.6-1.6 0-1.2-1-1.4-1-2.4 0-.9.7-1.5 1.7-1.5H17a4 4 0 004-4c0-4.4-4-8.5-9-8.5z" strokeLinejoin="round" />
          <circle cx="7.5" cy="11" r="1" fill="currentColor" />
          <circle cx="10.5" cy="7" r="1" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1" fill="currentColor" />
        </svg>
        <span className="hidden sm:inline">Appearance</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Appearance"
          className="absolute right-0 z-40 mt-2 max-h-[calc(100vh-var(--header-h)-1.5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-300 bg-white p-4 shadow-xl"
        >
          <div className="space-y-4">
            <div>
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => {
                  const active = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ theme: t.id })}
                      className={cn(
                        "rounded-xl border-2 p-2 text-left transition",
                        active ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <span className="flex h-9 overflow-hidden rounded-lg border border-black/10" style={{ background: t.swatch[0] }}>
                        <span className="m-1.5 flex-1 rounded-md" style={{ background: t.swatch[1] }} />
                        <span className="my-1.5 mr-1.5 w-3 rounded-md" style={{ background: t.swatch[2] }} />
                      </span>
                      <span className="mt-1.5 block text-xs font-semibold text-slate-900">{t.label}</span>
                      <span className="block text-[11px] text-slate-600">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Font</Label>
              <div className="grid gap-1.5">
                {FONTS.map((f) => {
                  const active = f.id === font;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ font: f.id })}
                      style={{ fontFamily: f.family }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-slate-900 transition",
                        active ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="font-semibold">{f.label}</span>
                      <span className="tabular text-slate-600">Aa 1,23,456</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Text size</Label>
              <div role="group" aria-label="Text size" className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={s.id === size}
                    onClick={() => update({ size: s.id })}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                      s.id === size ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <p className="text-[11px] text-slate-600">Saved on this device. Downloads stay the same.</p>
              <button type="button" onClick={reset} className="text-xs font-semibold text-indigo-700 hover:underline">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
