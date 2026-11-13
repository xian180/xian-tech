// ---------------------------------------------------------------------------
// Flipkart Payments & Revenue Report (from the monthly payment / settlement
// report, one file per month; several months can be uploaded together).
//
// What is read from the "Orders" sheet of each file (one row = one order item):
//   Sale Amount (Rs.)  = what the customer paid
//   Refund (Rs.)       = money given back for a return (negative number)
//   Seller SKU, Quantity
// Gross Sale = total of Sale Amount | Refund = total of Refund
// Net Revenue = Gross Sale + Refund (the money kept after returns, before Flipkart fees)
// Bank Settlement = total of "Bank Settlement Value (Rs.)" (what Flipkart pays out after fees, taxes and refunds)
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
  /** Payment Date of the row as written in the file (used by the date filter) */
  date: string;
  /** Taxes on this row, negative as Flipkart writes them */
  tcs: number;
  tds: number;
  gstOnFees: number;
  /** "Bank Settlement Value (Rs.)" of this row: what Flipkart pays out for it, after fees and taxes */
  bank: number;
}

/** One row of the "Ads" sheet, as written in the file (negative = money out) */
export interface PaymentAdsRow {
  date: string;
  topup: number;
  redeem: number;
  refund: number;
  gst: number;
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
  /** Flipkart's own bank settlement total from the Summary sheet (null when not found) */
  summaryBank: number | null;
  /** true when the Orders sheet has the "Bank Settlement Value (Rs.)" column */
  hasBank: boolean;
  /** Taxes deducted on the order lines (negative numbers, as Flipkart writes them) */
  tax: { tcs: number; tds: number; gstOnFees: number };
  /** The "Ads" sheet: wallet movements for advertisement (null when the file has no Ads sheet) */
  ads: { topup: number; redeem: number; refund: number; gst: number; rows: number } | null;
  /** Rows of the Ads sheet (the date filter works on these) */
  adsRows: PaymentAdsRow[];
  /** Set when a date filter was applied: only this part of the file is counted */
  dateFilter?: string;
  /** Flipkart's own tax / ads totals from the Summary sheet (null when not found) */
  summaryTax: {
    tcs: number | null;
    tds: number | null;
    gstOnFees: number | null;
    gstOnAds: number | null;
    adsFees: number | null;
    credit: number | null;
  };
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

/** Like numberBeside, but for a label that only has to contain `part` (Summary sheet wording varies a little). */
function numberBesideLike(aoa: unknown[][], part: string): number | null {
  for (const row of aoa) {
    const at = row.findIndex((c) => typeof c === "string" && norm(c).includes(part));
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
  const tax = { tcs: 0, tds: 0, gstOnFees: 0 };
  const dateAt = col.get("payment date");
  const bankAt = col.get("bank settlement value (rs.)");
  const taxCol = { tcs: col.get("tcs (rs.)"), tds: col.get("tds (rs.)"), gstOnFees: col.get("gst on mp fees (rs.)") };
  const cellNum = (row: unknown[], i: number | undefined) => (i === undefined ? 0 : parseNumber(String(row[i] ?? "")));
  for (const row of aoa.slice(headerAt + 1)) {
    if (String(row[at("id")] ?? "").trim() === "") continue; // blank or total line
    const rowTcs = cellNum(row, taxCol.tcs);
    const rowTds = cellNum(row, taxCol.tds);
    const rowGst = cellNum(row, taxCol.gstOnFees);
    tax.tcs += rowTcs;
    tax.tds += rowTds;
    tax.gstOnFees += rowGst;
    lines.push({
      sku: names.canon(String(row[at("sku")] ?? "")),
      sale: parseNumber(String(row[at("sale")] ?? "")),
      refund: parseNumber(String(row[at("refund")] ?? "")),
      qty: parseNumber(String(row[at("qty")] ?? "")),
      date: dateAt === undefined ? "" : String(row[dateAt] ?? "").trim(),
      tcs: rowTcs,
      tds: rowTds,
      gstOnFees: rowGst,
      bank: cellNum(row, bankAt),
    });
  }
  if (lines.length === 0) throw new ReportInputError(`The payment file "${file.name}" has no order rows.`);

  let period: string | null = null;
  let summarySale: number | null = null;
  let summaryRefund: number | null = null;
  let summaryBank: number | null = null;
  const summaryName = sheetNamed("summary of report");
  if (summaryName) {
    const s = toAoa(summaryName);
    for (const row of s) {
      const i = row.findIndex((c) => norm(c) === "payment duration");
      if (i >= 0) period = String(row.slice(i + 1).find((c) => String(c).trim() !== "") ?? "").trim() || null;
    }
    summarySale = numberBeside(s, "sales amount");
    summaryRefund = numberBeside(s, "returns reversal");
    summaryBank = numberBesideLike(s, "bank settlement");
  }
  const summaryTax = { tcs: null, tds: null, gstOnFees: null, gstOnAds: null, adsFees: null, credit: null } as PaymentFile["summaryTax"];
  if (summaryName) {
    const s = toAoa(summaryName);
    summaryTax.tcs = numberBeside(s, "tcs");
    summaryTax.tds = numberBeside(s, "tds");
    summaryTax.gstOnFees = numberBeside(s, "gst on marketplace fees");
    summaryTax.gstOnAds = numberBeside(s, "gst on ads fees");
    summaryTax.adsFees = numberBeside(s, "ads fees");
    summaryTax.credit = numberBeside(s, "input gst + tcs credits (b)");
  }

  let ads: PaymentFile["ads"] = null;
  const adsRows: PaymentAdsRow[] = [];
  const adsName = sheetNamed("ads");
  if (adsName) {
    const a = toAoa(adsName);
    const hAt = a.slice(0, 8).findIndex((r) => r.some((c) => norm(c) === "neft id"));
    if (hAt >= 0) {
      const ac = new Map<string, number>();
      a[hAt].forEach((h, i) => {
        const k = norm(h);
        if (k && !ac.has(k)) ac.set(k, i);
      });
      const typeAt = ac.get("type");
      const sum = { topup: 0, redeem: 0, refund: 0, gst: 0, rows: 0 };
      for (const row of a.slice(hAt + 1)) {
        if (typeAt === undefined || String(row[typeAt] ?? "").trim() === "") continue;
        sum.rows++;
        // redeem and its reversal belong together: the sheet shows them in two columns
        const ar: PaymentAdsRow = {
          date: String(row[ac.get("payment date") ?? -1] ?? "").trim(),
          redeem: cellNum(row, ac.get("wallet redeem (rs.)")) + cellNum(row, ac.get("wallet redeem reversal (rs.)")),
          topup: cellNum(row, ac.get("wallet topup (rs.)")),
          refund: cellNum(row, ac.get("wallet refund (rs.)")),
          gst: cellNum(row, ac.get("gst on ads fees (rs.)")),
        };
        adsRows.push(ar);
        sum.redeem += ar.redeem;
        sum.topup += ar.topup;
        sum.refund += ar.refund;
        sum.gst += ar.gst;
      }
      ads = sum;
    }
  }

  const mk = period ? /(\d{4})-(\d{2})-\d{2}/.exec(period) : null;
  return {
    fileName: file.name,
    period,
    monthKey: mk ? `${mk[1]}-${mk[2]}` : null,
    lines,
    summarySale,
    summaryRefund,
    summaryBank,
    hasBank: bankAt !== undefined,
    tax,
    ads,
    adsRows,
    summaryTax,
  };
}

interface Bucket {
  sale: number;
  refund: number;
  sold: number;
  returned: number;
  bank: number;
}
const emptyBucket = (): Bucket => ({ sale: 0, refund: 0, sold: 0, returned: 0, bank: 0 });

function add(b: Bucket, l: PaymentLine) {
  b.sale += l.sale;
  b.refund += l.refund;
  b.bank += l.bank;
  if (l.sale > 0) b.sold += l.qty;
  if (l.refund < 0) b.returned += l.qty;
}

/** The same month uploaded twice must not be counted twice. */
export function dedupePaymentFiles(files: PaymentFile[]): { used: PaymentFile[]; skipped: string[] } {
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
  return { used, skipped };
}

export function monthKeyOf(f: PaymentFile, idx: number): string {
  return f.monthKey ?? `~${String(idx).padStart(3, "0")}`;
}
export function monthNameOf(f: PaymentFile): string {
  return f.monthKey ? monthLabel(f.monthKey) : f.fileName;
}

export function buildFlipkartPaymentReport(files: PaymentFile[]): ReportResult {
  const { used, skipped } = dedupePaymentFiles(files);

  const bySku = new Map<string, Bucket>();
  const byMonth = new Map<string, { label: string; b: Bucket }>();
  const total = emptyBucket();
  const mismatches: string[] = [];
  let checked = 0;
  const bankNotes: string[] = [];
  let bankChecked = 0;
  const showBank = used.length > 0 && used.every((f) => f.hasBank);

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
    if (showBank && f.summaryBank !== null) {
      bankChecked++;
      if (Math.abs(own.bank - f.summaryBank) > 1) {
        bankNotes.push(`${label}: order rows add up to ${inr(own.bank)}, Flipkart Summary says ${inr(f.summaryBank)}.`);
      }
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
  if (showBank) {
    const bank = round2(total.bank);
    insights.push(
      `Net Revenue is ${inr(netRevenue)} (before Flipkart fees). After fees and taxes, Bank Settlement is ${inr(bank)}, so ${inr(round2(netRevenue - bank))} (${netRevenue > 0 ? round2(((netRevenue - bank) / netRevenue) * 100) : 0}%) went to Flipkart fees and tax deductions.`
    );
    if (bankChecked > 0) {
      insights.push(
        bankNotes.length === 0
          ? `Check: Bank Settlement matches the Summary sheet of Flipkart for all ${bankChecked} file(s).`
          : `Bank Settlement differs from Flipkart's Summary sheet (the Summary may include costs that are not tied to one order, such as ads): ${bankNotes.join(" ")}`
      );
    }
  } else {
    insights.push("Net Revenue is before Flipkart fees, taxes (TCS/TDS) and ads. The money that reaches your bank is lower than this.");
    insights.push('Bank Settlement is not shown: the "Bank Settlement Value (Rs.)" column was not found in every payment file.');
  }
  const filtered = used.find((f) => f.dateFilter);
  if (filtered) {
    insights.push(
      `Date filter is on: only payments made ${filtered.dateFilter} (by Payment Date) are counted, so Flipkart's Summary check is skipped.`
    );
  }
  insights.push("State wise revenue is not available: Flipkart's payment report does not contain the customer's state.");
  insights.push(...skipped);

  return {
    title: "Flipkart Payments & Revenue Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Net Revenue", value: inr(netRevenue), helpText: "Gross Sale + Refund, before Flipkart fees and taxes" },
      ...(showBank
        ? [{ label: "Bank Settlement", value: inr(round2(total.bank)), helpText: "After Flipkart fees and taxes" }]
        : []),
      { label: "Gross Sale", value: inr(grossSale), helpText: "What customers paid" },
      { label: "Refunds", value: inr(refund), helpText: `${num(total.returned)} units returned` },
      { label: "Units Sold", value: num(total.sold), helpText: `${num(skuRows.length)} SKUs` },
      { label: "Payment Files", value: num(used.length), helpText: periodsText },
    ],
    tables: [
      {
        title: "SKU Wise Revenue",
        columns: ["SKU", "Net Revenue", ...(showBank ? ["Bank Settlement"] : []), "Gross Sale", "Refund", "Units Sold", "Units Returned"],
        rows: skuRows.map((r) => [r.sku, r.net, ...(showBank ? [round2(r.b.bank)] : []), round2(r.b.sale), round2(r.b.refund), r.b.sold, r.b.returned]),
        previewRows: 10,
        columnFormats: ["text", "money", ...(showBank ? ["money" as const] : []), "money", "money", "number", "number"],
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
        columns: ["Payment Month", "Net Revenue", ...(showBank ? ["Bank Settlement"] : []), "Gross Sale", "Refund", "Units Sold", "Units Returned"],
        rows: monthRows.map((m) => [m.label, net(m.b), ...(showBank ? [round2(m.b.bank)] : []), round2(m.b.sale), round2(m.b.refund), m.b.sold, m.b.returned]),
        columnFormats: ["text", "money", ...(showBank ? ["money" as const] : []), "money", "money", "number", "number"],
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
        subtitle: showBank ? "Gross Sale, Net Revenue and Bank Settlement" : "Gross Sale and Net Revenue",
        labels: monthRows.map((m) => m.label),
        series: [
          { name: "Gross Sale", data: monthRows.map((m) => round2(m.b.sale)) },
          { name: "Net Revenue", data: monthRows.map((m) => net(m.b)) },
          ...(showBank ? [{ name: "Bank Settlement", data: monthRows.map((m) => round2(m.b.bank)) }] : []),
        ],
        unit: "₹",
      },
    ],
    insights,
  };
}
