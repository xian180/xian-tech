// ---------------------------------------------------------------------------
// Flipkart SKU & Status Orders Report.
//   Orders = sum of `quantity`, grouped by SKU and by `order_item_status`.
// Flipkart's Orders download has no price or state column, so there is no
// revenue or state table (unlike Amazon).
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { addTo, num, round2, sortDesc, topWithOthers } from "../amazon/util";
import { loadFlipkartOrders } from "./load";
import { DEFAULT_FLIPKART_OPTIONS, type FlipkartOptions } from "./options";
import { SkuNames } from "./sku";

export function buildFlipkartOrdersReport(
  orders: ParsedTable,
  options: FlipkartOptions = DEFAULT_FLIPKART_OPTIONS,
  names: SkuNames = new SkuNames()
): ReportResult {
  const { lines, stats } = loadFlipkartOrders(orders, options, names);

  const skuUnits = new Map<string, number>();
  const statusUnits = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    addTo(skuUnits, l.sku, l.qty);
    addTo(statusUnits, l.status, l.qty);
    totalUnits += l.qty;
  }

  const skuSorted = sortDesc(skuUnits).filter(([, v]) => v > 0);
  const statusSorted = sortDesc(statusUnits).filter(([, v]) => v > 0);
  const unitsOf = (status: string) => statusUnits.get(status) ?? 0;
  const pct = (part: number) => (totalUnits > 0 ? `${round2((part / totalUnits) * 100)}%` : "0%");

  let running = 0;
  const cumulativeShare = skuSorted.slice(0, 10).map(([, v]) => {
    running += v;
    return totalUnits > 0 ? round2((running / totalUnits) * 100) : 0;
  });

  const insights: string[] = [];
  const period = stats.dates.label();
  if (period) insights.push(`Orders in this file are from ${period}.`);
  if (skuSorted[0]) insights.push(`Best-selling SKU: ${skuSorted[0][0]} (${num(skuSorted[0][1])} units).`);
  if (cumulativeShare.length >= 3) {
    insights.push(
      `Your top 3 SKUs bring ${cumulativeShare[2]}% of all units, and the top ${cumulativeShare.length} SKUs together bring ${
        cumulativeShare[cumulativeShare.length - 1]
      }%.`
    );
  }
  if (totalUnits > 0) {
    insights.push(
      `${pct(unitsOf("DELIVERED"))} of units are Delivered and ${pct(unitsOf("RETURNED"))} are marked Returned.`
    );
  }
  if (stats.cancelledRows > 0) {
    insights.push(
      options.excludeCancelled
        ? `${num(stats.cancelledRows)} cancelled order line(s) (${num(stats.cancelledUnits)} units) were left out.`
        : `${num(stats.cancelledRows)} cancelled order line(s) (${num(stats.cancelledUnits)} units) are counted in these totals. You can leave them out from Options.`
    );
  }

  const top10 = skuSorted.slice(0, 10);
  const donutStatus = topWithOthers(statusSorted, 6);

  return {
    title: "Flipkart SKU & Status Orders Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Units", value: num(totalUnits), helpText: `${num(stats.countedRows)} order lines` },
      { label: "SKUs", value: num(skuSorted.length) },
      { label: "Delivered Units", value: num(unitsOf("DELIVERED")) },
      { label: "Returned Units", value: num(unitsOf("RETURNED")), helpText: "Status RETURNED" },
      {
        label: options.excludeCancelled ? "Cancelled Units Left Out" : "Cancelled Units Counted",
        value: num(stats.cancelledUnits),
      },
    ],
    tables: [
      { title: "SKU Wise Orders", columns: ["SKU", "Orders"], rows: skuSorted, previewRows: 10, columnFormats: ["text", "number"] },
      { title: "Order Status Wise Orders", columns: ["Order Status", "Orders"], rows: statusSorted, columnFormats: ["text", "number"] },
    ],
    charts: [
      {
        type: "hbar",
        title: "Top 10 SKUs by Orders",
        subtitle: "Units per SKU",
        labels: top10.map(([k]) => k),
        series: [{ name: "Orders", data: top10.map(([, v]) => v) }],
        color: "indigo",
      },
      {
        type: "donut",
        title: "Orders by Status",
        subtitle: "Share of units in each order_item_status",
        labels: donutStatus.map(([k]) => k),
        series: [{ name: "Orders", data: donutStatus.map(([, v]) => v) }],
      },
    ],
    insights,
  };
}
