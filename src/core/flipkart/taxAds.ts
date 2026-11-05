// ---------------------------------------------------------------------------
// Flipkart Tax & Ads Summary (from the same monthly payment files).
//   TCS, TDS, GST on marketplace fees  -> "Orders" sheet of each payment file
//   Ads Fees, GST on Ads Fees          -> "Ads" sheet of each payment file
//   Input GST + TCS Credit = TCS + GST on marketplace fees + GST on Ads fees
//   Total Ads Cost         = Ads Fees + GST on Ads Fees
// Flipkart writes these as negative numbers (money deducted); here they are
// shown as plain positive amounts. Every total is compared with the Summary
// sheet of the same file.
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import { inr, num, round2 } from "../amazon/util";
import { dedupePaymentFiles, monthKeyOf, monthNameOf, type PaymentFile } from "./payments";

interface Month {
  label: string;
  tcs: number;
  tds: number;
  gstFees: number;
  gstAds: number;
  adsFees: number;
  topup: number;
  gross: number;
  hasAds: boolean;
}

const credit = (m: Month) => m.tcs + m.gstFees + m.gstAds;
const adsCost = (m: Month) => m.adsFees + m.gstAds;

export function buildFlipkartTaxAdsReport(files: PaymentFile[]): ReportResult {
  const { used, skipped } = dedupePaymentFiles(files);

  const months = new Map<string, Month>();
  const mismatches: string[] = [];
  let checked = 0;

  used.forEach((f, idx) => {
    const key = monthKeyOf(f, idx);
    const m =
      months.get(key) ??
      ({ label: monthNameOf(f), tcs: 0, tds: 0, gstFees: 0, gstAds: 0, adsFees: 0, topup: 0, gross: 0, hasAds: false } as Month);
    months.set(key, m);

    const own = {
      tcs: -f.tax.tcs,
      tds: -f.tax.tds,
      gstFees: -f.tax.gstOnFees,
      gstAds: f.ads ? -f.ads.gst : 0,
      adsFees: f.ads ? -(f.ads.topup + f.ads.redeem + f.ads.refund) : 0,
    };
    m.tcs += own.tcs;
    m.tds += own.tds;
    m.gstFees += own.gstFees;
    m.gstAds += own.gstAds;
    m.adsFees += own.adsFees;
    m.topup += f.ads ? -f.ads.topup : 0;
    m.hasAds = m.hasAds || f.ads !== null;
    for (const l of f.lines) m.gross += l.sale;

    // Compare with Flipkart's own Summary sheet (it writes these as negative numbers)
    const s = f.summaryTax;
    const pairs: [string, number, number | null][] = [
      ["TCS", own.tcs, s.tcs === null ? null : -s.tcs],
      ["TDS", own.tds, s.tds === null ? null : -s.tds],
      ["GST on Marketplace Fees", own.gstFees, s.gstOnFees === null ? null : -s.gstOnFees],
      ["Ads Fees", own.adsFees, s.adsFees === null ? null : -s.adsFees],
      ["GST on Ads Fees", own.gstAds, s.gstOnAds === null ? null : -s.gstOnAds],
      ["Input GST + TCS Credit", own.tcs + own.gstFees + own.gstAds, s.credit],
    ];
    const known = pairs.filter((p) => p[2] !== null);
    if (known.length > 0) {
      checked++;
      for (const [name, ours, theirs] of known) {
        if (Math.abs(ours - (theirs as number)) > 1) {
          mismatches.push(`${monthNameOf(f)} ${name}: ${inr(ours)} here vs ${inr(theirs as number)} in Flipkart's Summary.`);
        }
      }
    }
  });

  const list = [...months.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, m]) => m);
  const total: Month = list.reduce(
    (t, m) => ({
      label: "Total",
      tcs: t.tcs + m.tcs,
      tds: t.tds + m.tds,
      gstFees: t.gstFees + m.gstFees,
      gstAds: t.gstAds + m.gstAds,
      adsFees: t.adsFees + m.adsFees,
      topup: t.topup + m.topup,
      gross: t.gross + m.gross,
      hasAds: t.hasAds || m.hasAds,
    }),
    { label: "Total", tcs: 0, tds: 0, gstFees: 0, gstAds: 0, adsFees: 0, topup: 0, gross: 0, hasAds: false } as Month
  );
  const pct = (m: Month) => (m.gross > 0 ? round2((adsCost(m) / m.gross) * 100) : 0);
  const withTotal = list.length > 1 ? [...list, total] : list;

  const insights: string[] = [];
  insights.push(`This report covers ${list.length} payment month(s): ${list.map((m) => m.label).join(", ")}.`);
  if (total.hasAds) {
    insights.push(
      `Advertisement: ${inr(adsCost(total))} was deducted for ads in total (${inr(total.adsFees)} Ads Fees + ${inr(total.gstAds)} GST on ads), which is ${pct(total)}% of the Gross Sale of ${inr(total.gross)}.`
    );
    const worst = [...list].sort((a, b) => pct(b) - pct(a))[0];
    if (list.length > 1 && worst) {
      insights.push(`Highest ads cost compared to sales: ${worst.label} (${inr(adsCost(worst))}, ${pct(worst)}% of that month's Gross Sale).`);
    }
    insights.push(
      "Ads Fees is mostly the money added to your Flipkart ads wallet (top-ups), so it can be more than the ads actually used. The Ads section of Seller Hub shows the real usage."
    );
  } else {
    insights.push("These payment files have no Ads sheet, so ad spend could not be calculated.");
  }
  insights.push(
    `Tax: ${inr(total.tcs)} TCS, ${inr(total.tds)} TDS, ${inr(total.gstFees)} GST on marketplace fees and ${inr(total.gstAds)} GST on ads fees were deducted.`
  );
  insights.push(
    `Input GST + TCS Credit is ${inr(credit(total))} (TCS + GST on marketplace fees + GST on ads fees). TDS (${inr(total.tds)}) is the Income Tax credit and is not part of it.`
  );
  if (checked > 0) {
    insights.push(
      mismatches.length === 0
        ? `Check: every amount here matches the Summary sheet of Flipkart for all ${checked} file(s).`
        : `Check: these amounts do NOT match the Summary sheet of Flipkart - ${mismatches.join(" ")}`
    );
  }
  const filtered = used.find((f) => f.dateFilter);
  if (filtered) {
    insights.push(
      `Date filter is on: only payments made ${filtered.dateFilter} (by Payment Date) are counted, so Flipkart's Summary check is skipped.`
    );
  }
  insights.push("These are the figures in Flipkart's payment report. Please confirm with your CA before using them for GST or Income Tax filing.");
  insights.push(...skipped);

  const r2 = round2;
  return {
    title: "Flipkart Tax & Ads Summary",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Ads Cost", value: inr(adsCost(total)), helpText: "Ads Fees + GST on Ads" },
      { label: "Ads Cost % of Sale", value: `${pct(total)}%`, helpText: `of ${inr(total.gross)} Gross Sale` },
      { label: "TCS", value: inr(total.tcs), helpText: "Tax collected at source" },
      { label: "TDS", value: inr(total.tds), helpText: "Income Tax deducted" },
      { label: "GST on Fees", value: inr(total.gstFees + total.gstAds), helpText: `${inr(total.gstFees)} marketplace + ${inr(total.gstAds)} ads` },
      { label: "Input GST + TCS Credit", value: inr(credit(total)), helpText: `${num(list.length)} month(s)` },
    ],
    tables: [
      {
        title: "Tax Summary (Month Wise)",
        columns: ["Payment Month", "TCS", "TDS", "GST on Marketplace Fees", "GST on Ads Fees", "Input GST + TCS Credit"],
        rows: withTotal.map((m) => [m.label, r2(m.tcs), r2(m.tds), r2(m.gstFees), r2(m.gstAds), r2(credit(m))]),
        columnFormats: ["text", "money", "money", "money", "money", "money"],
      },
      {
        title: "Ads Spend (Month Wise)",
        columns: ["Payment Month", "Total Ads Cost", "Ads Fees", "GST on Ads Fees", "Wallet Top-up", "Ads Cost % of Gross Sale"],
        rows: withTotal.map((m) => [m.label, r2(adsCost(m)), r2(m.adsFees), r2(m.gstAds), r2(m.topup), pct(m)]),
        columnFormats: ["text", "money", "money", "money", "money", "number"],
      },
    ],
    charts: [
      {
        type: "bar",
        title: "Ads Cost by Payment Month",
        subtitle: "Ads Fees and GST on ads deducted from your payments",
        labels: list.map((m) => m.label),
        series: [
          { name: "Ads Fees", data: list.map((m) => r2(m.adsFees)) },
          { name: "GST on Ads Fees", data: list.map((m) => r2(m.gstAds)) },
        ],
        unit: "₹",
        color: "amber",
      },
      {
        type: "bar",
        title: "Input GST + TCS Credit by Payment Month",
        subtitle: "TCS, GST on marketplace fees and GST on ads fees",
        labels: list.map((m) => m.label),
        series: [
          { name: "TCS", data: list.map((m) => r2(m.tcs)) },
          { name: "GST on Marketplace Fees", data: list.map((m) => r2(m.gstFees)) },
          { name: "GST on Ads Fees", data: list.map((m) => r2(m.gstAds)) },
        ],
        unit: "₹",
      },
    ],
    insights,
  };
}
