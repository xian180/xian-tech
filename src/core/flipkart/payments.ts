// ---------------------------------------------------------------------------
// Flipkart Payments & Revenue Report (from the monthly payment / settlement
// report, one file per month; several months can be uploaded together).
//
// What is read from the "Orders" sheet of each file (one row = one order item):
//   Sale Amount (Rs.)  = what the customer paid
//   Refund (Rs.)       = money given back for a return (negative number)
//   Seller SKU, Quantity
// Gross Sale = total of Sale Amount | Refund = total of Refund
// Net Revenue = Gross Sale + Refund (the money kept after returns)
//
// The file has NO customer state, so there is no State Wise table.
// The "Summary of report" sheet of every file has Flipkart's own totals for
// Sales Amount and Returns Reversal; we compare our totals with them.
// ---------------------------------------------------------------------------

import * as XLSX from "xlsx";
import type { ReportResult } from "../../types";
import { ReportInputError, parseNumber } from "../amazon/adapter";
import { inr, num, round2 } from "../amazon/util";
import { fixSheetRange } from "../readTable";
import type { SkuNames } from "./sku";

export interface PaymentLine {
  sku: string;
  sale: number;
  refund: number;
  qty: number;
}

export interface PaymentFile {
  fileName: string;
  /** e.g. "2026-08-01 - 2026-08-31" (from the Summary sheet) */
  period: string | null;
  /** e.g. "2026-08", used to sort months and to name them */
  monthKey: string | null;
  lines: PaymentLine[];
  /** Flipkart's own totals from the Summary sheet (null when not found) */
  summarySale: number | null;
  summaryRefund: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** First line of a heading, trimmed, lower case: "Bank Settlement Value (Rs.) \n= SUM(J:R)" -> "bank settlement value (rs.)" */
const norm = (v: unknown) =>
  String(v ?? "")
    .split(/\r?\n/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function monthLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  return m ? `${MONTHS[+m[2] - 1] ?? m[2]} ${m[1]}` : key;
}

/** First number found to the right of the cell whose text is `label` (Summary sheet). */
function numberBeside(aoa: unknown[][], label: string): number | null {
  for (const row of aoa) {
    const at = row.findIndex((c) => norm(c) === label);
    if (at < 0) continue;
    for (let i = at + 1; i < row.length; i++) {
      const raw = row[i];
      if (raw === "" || raw === null || raw === undefined) continue;
      if (typeof raw === "number") return raw;
      const n = Number(String(raw).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export async function readFlipkartPaymentFile(file: File, names: SkuNames): Promise<PaymentFile> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetNamed = (name: string) => wb.SheetNames.find((n) => n.trim().toLowerCase() === name);
  const ordersName = sheetNamed("orders");
  if (!ordersName) {
    throw new ReportInputError(
      `"${file.name}" does not look like a Flipkart payment (settlement) report: it has no "Orders" sheet.`
    );
  }

  const toAoa = (name: string) => {
    const sheet = wb.Sheets[name];
    fixSheetRange(sheet);
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  };

  const aoa = toAoa(ordersName);
  const headerAt = aoa.slice(0, 12).findIndex((r) => r.some((c) => norm(c) === "order item id"));
  if (headerAt < 0) {
    throw new ReportInputError(`"${file.name}": could not find the "Order item ID" heading in the Orders sheet.`);
  }
  const col = new Map<string, number>();
  aoa[headerAt].forEach((h, i) => {
    const k = norm(h);
    if (k && !col.has(k)) col.set(k, i);
  });
  const need = { id: "order item id", sale: "sale amount (rs.)", refund: "refund (rs.)", sku: "seller sku", qty: "quantity" };
  const missing = Object.values(need).filter((k) => !col.has(k));
  if (missing.length > 0) {
    throw new ReportInputError(`The payment file "${file.name}" is missing column(s): ${missing.join(", ")}.`);
  }
  const at = (k: keyof typeof need) => col.get(need[k])!;

  const lines: PaymentLine[] = [];
  for (const row of aoa.slice(headerAt + 1)) {
    if (String(row[at("id")] ?? "").trim() === "") continue; // blank or total line
    lines.push({
      sku: names.canon(String(row[at("sku")] ?? "")),
      sale: parseNumber(String(row[at("sale")] ?? "")),
      refund: parseNumber(String(row[at("refund")] ?? "")),
      qty: parseNumber(String(row[at("qty")] ?? "")),
    });
  }
  if (lines.length === 0) throw new ReportInputError(`The payment file "${file.name}" has no order rows.`);

  let period: string | null = null;
  let summarySale: number | null = null;
  let summaryRefund: number | null = null;
  const summaryName = sheetNamed("summary of report");
  if (summaryName) {
    const s = toAoa(summaryName);
    for (const row of s) {
      const i = row.findIndex((c) => norm(c) === "payment duration");
      if (i >= 0) period = String(row.slice(i + 1).find((c) => String(c).trim() !== "") ?? "").trim() || null;
    }
    summarySale = numberBeside(s, "sales amount");
    summaryRefund = numberBeside(s, "returns reversal");
  }
  const mk = period ? /(\d{4})-(\d{2})-\d{2}/.exec(period) : null;
  return { fileName: file.name, period, monthKey: mk ? `${mk[1]}-${mk[2]}` : null, lines, summarySale, summaryRefund };
}

interface Bucket {
  sale: number;
  refund: number;
  sold: number;
  returned: number;
}
const emptyBucket = (): Bucket => ({ sale: 0, refund: 0, sold: 0, returned: 0 });

function add(b: Bucket, l: PaymentLine) {
  b.sale += l.sale;
  b.refund += l.refund;
  if (l.sale > 0) b.sold += l.qty;
  if (l.refund < 0) b.returned += l.qty;
}

export function buildFlipkartPaymentReport(files: PaymentFile[]): ReportResult {
  // The same month uploaded twice must not be counted twice.
  const used: PaymentFile[] = [];
  const skipped: string[] = [];
  const seen = new Map<string, string>();
  for (const f of files) {
    const key = f.period ?? f.fileName;
    const first = seen.get(key);
    if (first) {
      skipped.push(`"${f.fileName}" has the same payment period as "${first}", so it was counted only once.`);
      continue;
    }
    seen.set(key, f.fileName);
    used.push(f);
  }

  const bySku = new Map<string, Bucket>();
  const byMonth = new Map<string, { label: string; b: Bucket }>();
  const total = emptyBucket();
  const mismatches: string[] = [];
  let checked = 0;

  used.forEach((f, idx) => {
    const key = f.monthKey ?? `~${String(idx).padStart(3, "0")}`;
    const label = f.monthKey ? monthLabel(f.monthKey) : f.fileName;
    const month = byMonth.get(key) ?? { label, b: emptyBucket() };
    byMonth.set(key, month);
    const own = emptyBucket();
    for (const l of f.lines) {
      const s = bySku.get(l.sku) ?? emptyBucket();
      bySku.set(l.sku, s);
      add(s, l);
      add(month.b, l);
      add(total, l);
      add(own, l);
    }
    if (f.summarySale !== null && f.summaryRefund !== null) {
      checked++;
      if (Math.abs(own.sale - f.summarySale) > 1 || Math.abs(own.refund - f.summaryRefund) > 1) {
        mismatches.push(
          `${label}: our Sale ${inr(own.sale)} / Refund ${inr(own.refund)} vs Flipkart Summary ${inr(f.summarySale)} / ${inr(f.summaryRefund)}.`
        );
      }
    }
  });

  const net = (b: Bucket) => round2(b.sale + b.refund);
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

  const skuRows = [...bySku.entries()]
    .map(([sku, b]) => ({ sku, b, net: net(b) }))
    .sort((a, b) => b.net - a.net || byName(a.sku, b.sku));
  const refundRows = [...bySku.entries()]
    .filter(([, b]) => b.refund < 0)
    .map(([sku, b]) => ({ sku, b }))
    .sort((a, b) => a.b.refund - b.b.refund || byName(a.sku, b.sku));
  const monthRows = [...byMonth.entries()].sort((a, b) => byName(a[0], b[0])).map(([, m]) => m);

  const grossSale = round2(total.sale);
  const refund = round2(total.refund);
  const netRevenue = net(total);
  const top10 = skuRows.slice(0, 10);
  const top10Net = top10.reduce((s, r) => s + r.net, 0);
  const periodsText = monthRows.map((m) => m.label).join(", ");

  const insights: string[] = [];
  insights.push(`This report covers ${used.length} payment file(s): ${periodsText}.`);
  if (grossSale > 0) {
    insights.push(
      `Out of ${inr(grossSale)} Gross Sale, ${inr(-refund)} (${round2((-refund / grossSale) * 100)}%) went back as refunds, so you kept ${inr(netRevenue)}.`
    );
  }
  if (skuRows[0]) insights.push(`Top SKU by Net Revenue: ${skuRows[0].sku} (${inr(skuRows[0].net)}).`);
  if (netRevenue > 0 && top10.length >= 3) {
    insights.push(`Your top ${top10.length} SKUs bring ${round2((top10Net / netRevenue) * 100)}% of the Net Revenue.`);
  }
  if (refundRows[0]) {
    insights.push(`Biggest refund: ${refundRows[0].sku} (${inr(-refundRows[0].b.refund)} refunded, ${num(refundRows[0].b.returned)} units).`);
  }
  if (checked > 0) {
    insights.push(
      mismatches.length === 0
        ? `Check: Sale and Refund totals match the Summary sheet of Flipkart for all ${checked} file(s).`
        : `Check: these totals do NOT match the Summary sheet of Flipkart - ${mismatches.join(" ")}`
    );
  }
  insights.push("State wise revenue is not available: Flipkart's payment report does not contain the customer's state.");
  insights.push(...skipped);

  return {
    title: "Flipkart Payments & Revenue Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Net Revenue", value: inr(netRevenue), helpText: "Gross Sale + Refund" },
      { label: "Gross Sale", value: inr(grossSale), helpText: "What customers paid" },
      { label: "Refunds", value: inr(refund), helpText: `${num(total.returned)} units returned` },
      { label: "Units Sold", value: num(total.sold), helpText: `${num(skuRows.length)} SKUs` },
      { label: "Payment Files", value: num(used.length), helpText: periodsText },
    ],
    tables: [
      {
        title: "SKU Wise Revenue",
        columns: ["SKU", "Net Revenue", "Gross Sale", "Refund", "Units Sold", "Units Returned"],
        rows: skuRows.map((r) => [r.sku, r.net, round2(r.b.sale), round2(r.b.refund), r.b.sold, r.b.returned]),
        previewRows: 10,
        columnFormats: ["text", "money", "money", "money", "number", "number"],
      },
      {
        title: "SKU Wise Refunds",
        columns: ["SKU", "Refund", "Gross Sale", "Units Returned"],
        rows: refundRows.map((r) => [r.sku, round2(r.b.refund), round2(r.b.sale), r.b.returned]),
        previewRows: 10,
        columnFormats: ["text", "money", "money", "number"],
      },
      {
        title: "Month Wise Revenue",
        columns: ["Payment Month", "Net Revenue", "Gross Sale", "Refund", "Units Sold", "Units Returned"],
        rows: monthRows.map((m) => [m.label, net(m.b), round2(m.b.sale), round2(m.b.refund), m.b.sold, m.b.returned]),
        columnFormats: ["text", "money", "money", "money", "number", "number"],
      },
    ],
    charts: [
      {
        type: "hbar",
        title: "Top 10 SKUs by Net Revenue",
        subtitle: "After returns (Gross Sale + Refund)",
        labels: top10.map((r) => r.sku),
        series: [{ name: "Net Revenue", data: top10.map((r) => r.net) }],
        unit: "₹",
        color: "emerald",
      },
      {
        type: "bar",
        title: "Revenue by Payment Month",
        subtitle: "Gross Sale and Net Revenue",
        labels: monthRows.map((m) => m.label),
        series: [
          { name: "Gross Sale", data: monthRows.map((m) => round2(m.b.sale)) },
          { name: "Net Revenue", data: monthRows.map((m) => net(m.b)) },
        ],
        unit: "₹",
      },
    ],
    insights,
  };
}
