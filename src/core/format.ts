// Number formatting shared by the screen, Excel and PDF outputs.

export type ColumnFormat = "text" | "number" | "money";

/** 17690 -> "₹17,690.00" (Indian digit grouping, always 2 decimals) */
export function formatMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCell(value: string | number, format?: ColumnFormat): string {
  if (typeof value !== "number") return value;
  if (format === "money") return formatMoney(value);
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
