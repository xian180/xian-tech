// ---------------------------------------------------------------------------
// SKU cleaning for Flipkart.
// Flipkart writes SKUs like  SKU:Floral Printed Navy  or  """SKU:Floral Printed Navy"""
// in the download. The "real" SKU is what comes after `SKU:`, without quotes.
// Capital / small letters do not matter ("Floral khaki" = "Floral Khaki").
// ---------------------------------------------------------------------------

/** `"""SKU:Floral Printed Navy """` -> `Floral Printed Navy` */
export function cleanSku(raw: string | undefined): string {
  const noQuotes = (raw ?? "").replace(/["\u201C\u201D]/g, "").trim();
  return noQuotes.replace(/^sku\s*:\s*/i, "").replace(/\s+/g, " ").trim();
}

/**
 * Gives every SKU one display name, whatever the capital / small letters.
 * The first spelling seen wins. Use ONE instance for the Orders and the
 * Returns file so both reports show the same spelling.
 */
export class SkuNames {
  private seen = new Map<string, string>();

  canon(raw: string | undefined): string {
    const clean = cleanSku(raw);
    if (!clean) return "(blank SKU)";
    const key = clean.toLowerCase();
    const known = this.seen.get(key);
    if (known) return known;
    this.seen.set(key, clean);
    return clean;
  }
}
