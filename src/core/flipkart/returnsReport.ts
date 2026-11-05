// ---------------------------------------------------------------------------
// Flipkart Returns Report.
//   Return Qty = sum of `quantity`, grouped by SKU, return_type,
//   return_result and return_expectation.
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { addTo, num, round2, sortDesc, topWithOthers } from "../amazon/util";
import { loadFlipkartReturns } from "./load";
import { DEFAULT_FLIPKART_OPTIONS, type FlipkartOptions } from "./options";
import { SkuNames } from "./sku";

export function buildFlipkartReturnsReport(
  returns: ParsedTable,
  options: FlipkartOptions = DEFAULT_FLIPKART_OPTIONS,
  names: SkuNames = new SkuNames()
): ReportResult {
  const { lines, stats } = loadFlipkartReturns(returns, options, names);

  const bySku = new Map<string, number>();
  const byType = new Map<string, number>();
  const byResult = new Map<string, number>();
  const byExpectation = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    addTo(bySku, l.sku, l.qty);
    addTo(byType, l.type, l.qty);
    addTo(byResult, l.result, l.qty);
    addTo(byExpectation, l.expectation, l.qty);
    totalUnits += l.qty;
  }

  const skuSorted = sortDesc(bySku).filter(([, v]) => v > 0);
  const typeSorted = sortDesc(byType).filter(([, v]) => v > 0);
  const resultSorted = sortDesc(byResult).filter(([, v]) => v > 0);
  const expectationSorted = sortDesc(byExpectation).filter(([, v]) => v > 0);
  const pct = (part: number) => (totalUnits > 0 ? `${round2((part / totalUnits) * 100)}%` : "0%");

  const insights: string[] = [];
  const period = stats.dates.label();
  if (period) insights.push(`Returns in this file were approved between ${period}.`);
  if (skuSorted[0]) insights.push(`Most returned SKU: ${skuSorted[0][0]} (${num(skuSorted[0][1])} units).`);
  if (typeSorted[0]) insights.push(`Main return type: ${typeSorted[0][0]} (${pct(typeSorted[0][1])} of returned units).`);
  if (resultSorted[0]) insights.push(`Main return result: ${resultSorted[0][0]} (${pct(resultSorted[0][1])} of returned units).`);
  if (stats.cancelledRows > 0) {
    insights.push(
      options.excludeCancelledReturns
        ? `${num(stats.cancelledRows)} return line(s) with status "cancelled" (${num(stats.cancelledUnits)} units) were left out.`
        : `${num(stats.cancelledRows)} return line(s) with status "cancelled" (${num(stats.cancelledUnits)} units) are still counted. You can leave them out from Options.`
    );
  }

  const top10 = skuSorted.slice(0, 10);
  const donut = (title: string, subtitle: string, entries: [string, number][]) => {
    const d = topWithOthers(entries, 6);
    return {
      type: "donut" as const,
      title,
      subtitle,
      labels: d.map(([k]) => k),
      series: [{ name: "Return Qty", data: d.map(([, v]) => v) }],
    };
  };

  return {
    title: "Flipkart Returns Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Units Returned", value: num(totalUnits), helpText: `${num(stats.countedRows)} return lines` },
      { label: "SKUs With Returns", value: num(skuSorted.length) },
      { label: "Courier Returns", value: num(byType.get("courier_return") ?? 0) },
      { label: "Customer Returns", value: num(byType.get("customer_return") ?? 0) },
    ],
    tables: [
      { title: "SKU Wise Returns", columns: ["SKU", "Return Qty"], rows: skuSorted, previewRows: 10, columnFormats: ["text", "number"] },
      { title: "Return Type Wise", columns: ["Return Type", "Return Qty"], rows: typeSorted, columnFormats: ["text", "number"] },
      { title: "Return Result Wise", columns: ["Return Result", "Return Qty"], rows: resultSorted, columnFormats: ["text", "number"] },
      { title: "Return Expectation Wise", columns: ["Return Expectation", "Return Qty"], rows: expectationSorted, columnFormats: ["text", "number"] },
    ],
    charts: [
      {
        type: "hbar",
        title: "Top 10 SKUs by Returns",
        subtitle: "Returned units per SKU",
        labels: top10.map(([k]) => k),
        series: [{ name: "Return Qty", data: top10.map(([, v]) => v) }],
        color: "rose",
      },
      donut("Returns by Type", "Share of returned units by return_type", typeSorted),
      donut("Returns by Result", "Share of returned units by return_result", resultSorted),
      donut("Returns by Expectation", "Share of returned units by return_expectation", expectationSorted),
    ],
    insights,
  };
}
