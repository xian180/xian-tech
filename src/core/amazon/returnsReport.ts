// ---------------------------------------------------------------------------
// Amazon Returns Report.
//   Return Qty = sum of `Return quantity`, grouped by Merchant SKU and Return type.
// Same layout as the Flipkart Returns report. Sub-filter: return type, then the
// nested "Return status" (hidden while its column is not set up).
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import {
  applyReturnFilter,
  buildReturnFilterInfo,
  NO_RETURN_FILTER,
  prettyLabel,
  returnFilterInsight,
  titleWithReturnFilter,
  type ReturnFilterState,
} from "../returnFilter";
import { DEFAULT_OPTIONS, type AmazonOptions } from "./options";
import { loadAmazonReturns } from "./returns";
import { addTo, num, round2, sortDesc, topWithOthers } from "./util";

export function buildAmazonReturnsReport(
  returns: ParsedTable,
  options: AmazonOptions = DEFAULT_OPTIONS,
  filter: ReturnFilterState = NO_RETURN_FILTER
): ReportResult {
  const { lines: allLines, stats } = loadAmazonReturns(returns, options);
  const info = buildReturnFilterInfo(allLines, filter);
  const lines = applyReturnFilter(allLines, info.state);

  const bySku = new Map<string, number>();
  const byType = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    addTo(bySku, l.sku, l.qty);
    addTo(byType, l.type, l.qty);
    totalUnits += l.qty;
  }

  const skuSorted = sortDesc(bySku).filter(([, v]) => v > 0);
  const typeSorted = sortDesc(byType).filter(([, v]) => v > 0);
  const pct = (part: number) => (totalUnits > 0 ? `${round2((part / totalUnits) * 100)}%` : "0%");

  const insights: string[] = [];
  const filterNote = returnFilterInsight(info);
  if (filterNote) insights.push(filterNote);
  const period = stats.dates.label();
  if (period) insights.push(`Return requests in this file are from ${period}.`);
  if (skuSorted[0]) insights.push(`Most returned SKU: ${skuSorted[0][0]} (${num(skuSorted[0][1])} units).`);
  if (typeSorted[0]) {
    insights.push(`Main return type: ${prettyLabel(typeSorted[0][0])} (${pct(typeSorted[0][1])} of returned units).`);
  }
  if (stats.rejectedRows > 0) {
    insights.push(
      options.excludeRejectedReturns
        ? `${num(stats.rejectedRows)} return line(s) marked "Rejected" (${num(stats.rejectedUnits)} units) were left out.`
        : `${num(stats.rejectedRows)} return line(s) marked "Rejected" (${num(stats.rejectedUnits)} units) are still counted. You can leave them out from Options.`
    );
  }

  const top10 = skuSorted.slice(0, 10);
  const donutType = topWithOthers(typeSorted, 6);

  return {
    title: titleWithReturnFilter("Amazon Returns Report", info),
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Units Returned", value: num(totalUnits), helpText: `${num(lines.length)} return lines` },
      { label: "SKUs With Returns", value: num(skuSorted.length) },
      { label: "Return Types", value: num(typeSorted.length) },
      { label: "Main Return Type", value: typeSorted[0] ? prettyLabel(typeSorted[0][0]) : "-" },
    ],
    tables: [
      { title: "SKU Wise Returns", columns: ["SKU", "Return Qty"], rows: skuSorted, previewRows: 10, columnFormats: ["text", "number"] },
      { title: "Return Type Wise", columns: ["Return Type", "Return Qty"], rows: typeSorted, columnFormats: ["text", "number"] },
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
      {
        type: "donut",
        title: "Returns by Type",
        subtitle: "Share of returned units by Return type",
        labels: donutType.map(([k]) => k),
        series: [{ name: "Return Qty", data: donutType.map(([, v]) => v) }],
      },
    ],
    insights,
  };
}
