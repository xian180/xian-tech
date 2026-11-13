// Appearance choices (theme, font, text size). Saved in the visitor's own browser only.

export type ThemeId = "light" | "cream" | "teal" | "dark";
export type FontId = "inter" | "jakarta" | "sourcesans" | "plex";
export type SizeId = "compact" | "comfortable" | "large";

export interface Appearance {
  theme: ThemeId;
  font: FontId;
  size: SizeId;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "light", font: "inter", size: "comfortable" };

/** swatch = [page, card, accent], only used to draw the little preview in the menu */
export const THEMES: { id: ThemeId; label: string; hint: string; swatch: [string, string, string] }[] = [
  { id: "light", label: "Light", hint: "Clean and bright", swatch: ["#e9edf4", "#ffffff", "#4f46e5"] },
  { id: "cream", label: "Executive", hint: "Warm paper, green", swatch: ["#efe9dc", "#fffdf8", "#14532d"] },
  { id: "teal", label: "Teal", hint: "Fresh and calm", swatch: ["#d9ecea", "#ffffff", "#0f766e"] },
  { id: "dark", label: "Dark", hint: "Easy on the eyes", swatch: ["#0b1220", "#121a2b", "#818cf8"] },
];

export const FONTS: { id: FontId; label: string; family: string; google?: string }[] = [
  { id: "inter", label: "Inter", family: '"Inter", sans-serif' },
  { id: "jakarta", label: "Plus Jakarta Sans", family: '"Plus Jakarta Sans", sans-serif', google: "Plus+Jakarta+Sans:wght@400;500;600;700;800" },
  { id: "sourcesans", label: "Source Sans", family: '"Source Sans 3", sans-serif', google: "Source+Sans+3:wght@400;500;600;700;800" },
  { id: "plex", label: "IBM Plex Sans", family: '"IBM Plex Sans", sans-serif', google: "IBM+Plex+Sans:wght@400;500;600;700" },
];

export const SIZES: { id: SizeId; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Normal" },
  { id: "large", label: "Large" },
];

const STORAGE_KEY = "xian-appearance-v1";

export function loadAppearance(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Appearance>;
    return {
      theme: THEMES.some((t) => t.id === raw.theme) ? (raw.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
      font: FONTS.some((f) => f.id === raw.font) ? (raw.font as FontId) : DEFAULT_APPEARANCE.font,
      size: SIZES.some((s) => s.id === raw.size) ? (raw.size as SizeId) : DEFAULT_APPEARANCE.size,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(a: Appearance): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* private mode or storage blocked: the choice just lasts until the page is closed */
  }
}

const loadedFonts = new Set<string>();

/** Adds the Google Fonts stylesheet for a font the first time it is needed (Inter is always loaded). */
export function ensureFontLoaded(id: FontId): void {
  const font = FONTS.find((f) => f.id === id);
  if (!font?.google || loadedFonts.has(id)) return;
  loadedFonts.add(id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

export function applyAppearance(a: Appearance): void {
  ensureFontLoaded(a.font);
  const root = document.documentElement;
  root.dataset.theme = a.theme;
  root.dataset.font = a.font;
  root.dataset.size = a.size;
}
