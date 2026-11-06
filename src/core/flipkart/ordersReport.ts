// ---------------------------------------------------------------------------
// Flipkart SKU & Status Orders Report.
//   Orders = sum of `quantity`, grouped by SKU and by `order_item_status`.
// Flipkart's Orders download has no price or state column, so there is no
// revenue or state table (unlike Amazon).
//
// Sub-filter (All / Without return / Without return and cancellation):
// the order lines are grouped (normal / returned / cancelled) and the report
// is built only from the lines the chosen sub-filter keeps.
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { addTo, num, round2, sortDesc, topWithOthers } from "../amazon/util";
import {
  availableSubFilters,
  keepGroup,
  SUB_FILTER_LABELS,
  type GroupUnits,
  type SubFilterKey,
} from "../subFilter";
import { loadFlipkartOrders } from "./load";
import { flipkartOrderGroup } from "./orderGroup";
import { DEFAULT_FLIPKART_OPTIONS, type FlipkartOptions } from "./options";
import { SkuNames } from "./sku";

export interface FlipkartOrdersView {
  report: ReportResult;
  /** Units in each group, before the sub-filter (so the buttons can show their totals) */
  groupUnits: GroupUnits;
  /** Sub-filters that have data; only "all" means the bar is not shown */
  available: SubFilterKey[];
  /** The sub-filter really used (falls back to "all" if the asked one has no data) */
  subFilter: SubFilterKey;
}

export function buildFlipkartOrdersView(
  orders: ParsedTable,
  options: FlipkartOptions = DEFAULT_FLIPKART_OPTIONS,
  names: SkuNames = new SkuNames(),
  requested: SubFilterKey = "all"
): FlipkartOrdersView {
  const { lines: allLines, stats } = loadFlipkartOrders(orders, options, names);

  const groupUnits: GroupUnits = { normal: 0, returned: 0, cancelled: 0 };
  for (const l of allLines) groupUnits[flipkartOrderGroup(l.status)] += l.qty;

  const available = availableSubFilters(groupUnits);
  const subFilter: SubFilterKey = available.includes(requested) ? requested : "all";
  const lines = subFilter === "all" ? allLines : allLines.filter((l) => keepGroup(flipkartOrderGroup(l.status), subFilter));

  const skuUnits = new Map<string, number>();
  const statusUnits = new Map<string, number>();
  let totalUnits = 0;
  let cancelledRows = 0;
  let cancelledUnits = 0;
  for (const l of lines) {
    addTo(skuUnits, l.sku, l.qty);
    addTo(statusUnits, l.status, l.qty);
    totalUnits += l.qty;
    if (flipkartOrderGroup(l.status) === "cancelled") {
      cancelledRows += 1;
      cancelledUnits += l.qty;
    }
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
  if (subFilter !== "all") {
    const leftOut: string[] = [];
    if (!keepGroup("returned", subFilter) && groupUnits.returned > 0) leftOut.push(`${num(groupUnits.returned)} returned`);
    if (!keepGroup("cancelled", subFilter) && groupUnits.cancelled > 0) leftOut.push(`${num(groupUnits.cancelled)} cancelled`);
    insights.push(
      `Sub-filter "${SUB_FILTER_LABELS[subFilter]}": ${num(totalUnits)} of ${num(
        groupUnits.normal + groupUnits.returned + groupUnits.cancelled
      )} units are shown${leftOut.length > 0 ? `; ${leftOut.join(" and ")} units are left out` : ""}.`
    );
  }
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
  if (options.excludeCancelled) {
    if (stats.cancelledRows > 0) {
      insights.push(`${num(stats.cancelledRows)} cancelled order line(s) (${num(stats.cancelledUnits)} units) were left out.`);
    }
  } else if (cancelledRows > 0) {
    insights.push(
      `${num(cancelledRows)} cancelled order line(s) (${num(cancelledUnits)} units) are counted in these totals. Use the sub-filter to leave them out.`
    );
  }

  const top10 = skuSorted.slice(0, 10);
  const donutStatus = topWithOthers(statusSorted, 6);

  const report: ReportResult = {
    title: subFilter === "all" ? "Flipkart SKU & Status Orders Report" : `Flipkart SKU & Status Orders Report (${SUB_FILTER_LABELS[subFilter]})`,
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Units", value: num(totalUnits), helpText: `${num(lines.length)} order lines` },
      { label: "SKUs", value: num(skuSorted.length) },
      { label: "Delivered Units", value: num(unitsOf("DELIVERED")) },
      { label: "Returned Units", value: num(unitsOf("RETURNED")), helpText: "Status RETURNED" },
      {
        label: options.excludeCancelled ? "Cancelled Units Left Out" : "Cancelled Units Counted",
        value: num(options.excludeCancelled ? stats.cancelledUnits : cancelledUnits),
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

  return { report, groupUnits, available, subFilter };
}

/** Same report as before (sub-filter "All"), kept so other code that calls it keeps working. */
export function buildFlipkartOrdersReport(
  orders: ParsedTable,
  options: FlipkartOptions = DEFAULT_FLIPKART_OPTIONS,
  names: SkuNames = new SkuNames()
): ReportResult {
  return buildFlipkartOrdersView(orders, options, names, "all").report;
}
