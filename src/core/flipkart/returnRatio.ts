// ---------------------------------------------------------------------------
// SKU Return Ratio (Flipkart). Same rules as the Amazon report:
//   Orders          = units per SKU (from the Orders file)
//   Return quantity = returned units per SKU (from the Returns file)
//   Return Ratio    = Return quantity / Orders
// Only SKUs that appear in the Returns file are listed.
// ---------------------------------------------------------------------------

import type { ReportChart, ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { addTo, num, round2 } from "../amazon/util";
import {
  applyReturnFilter,
  buildReturnFilterInfo,
  NO_RETURN_FILTER,
  returnFilterInsight,
  titleWithReturnFilter,
  type ReturnFilterState,
} from "../returnFilter";
import { loadFlipkartOrders, loadFlipkartReturns } from "./load";
import { DEFAULT_FLIPKART_OPTIONS, type FlipkartOptions } from "./options";
import { SkuNames } from "./sku";

export function buildFlipkartReturnRatio(
  orders: ParsedTable,
  returns: ParsedTable,
  options: FlipkartOptions = DEFAULT_FLIPKART_OPTIONS,
  names: SkuNames = new SkuNames(),
  filter: ReturnFilterState = NO_RETURN_FILTER
): ReportResult {
  const { lines, stats } = loadFlipkartOrders(orders, options, names);
  const { lines: allReturnLines, stats: returnStats } = loadFlipkartReturns(returns, options, names);
  // Sub-filter (return type / return status) decides which returns are counted; Orders stay the same
  const info = buildReturnFilterInfo(allReturnLines, filter);
  const returnLines = applyReturnFilter(allReturnLines, info.state);

  const unitsBySku = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    addTo(unitsBySku, l.sku, l.qty);
    totalUnits += l.qty;
  }

  const returnsBySku = new Map<string, number>();
  let olderLines = 0;
  let olderUnits = 0;
  for (const l of returnLines) {
    addTo(returnsBySku, l.sku, l.qty);
    // a return whose order_item_id is not in the Orders file belongs to an older order
    if (l.orderItemId && stats.orderItemIds.size > 0 && !stats.orderItemIds.has(l.orderItemId)) {
      olderLines++;
      olderUnits += l.qty;
    }
  }

  // Start alphabetical, then apply two stable sorts (Orders, then Ratio).
  const rows = [...returnsBySku.keys()]
    .sort()
    .filter((sku) => (unitsBySku.get(sku) ?? 0) > 0)
    .map((sku) => {
      const orderUnits = unitsBySku.get(sku) ?? 0;
      const returned = returnsBySku.get(sku) ?? 0;
      return { sku, orderUnits, returned, ratio: returned / orderUnits };
    })
    .sort((a, b) => b.orderUnits - a.orderUnits)
    .sort((a, b) => b.ratio - a.ratio);

  const unmatched = [...returnsBySku.keys()].filter((sku) => (unitsBySku.get(sku) ?? 0) <= 0).sort();
  const matchedReturns = rows.reduce((s, r) => s + r.returned, 0);
  const overall = totalUnits > 0 ? matchedReturns / totalUnits : 0;
  const pct = (r: number) => `${round2(r * 100)}%`;

  const insights: string[] = [];
  const filterNote = returnFilterInsight(info);
  if (filterNote) insights.push(filterNote);
  const orderPeriod = stats.dates.label();
  const returnPeriod = returnStats.dates.label();
  if (orderPeriod) insights.push(`Orders file period: ${orderPeriod}.`);
  if (returnPeriod) {
    insights.push(
      `Returns approved between ${returnPeriod}. The ratio is most accurate when both periods cover the same orders.`
    );
  }
  if (rows[0]) {
    insights.push(
      `Highest return ratio: ${rows[0].sku} at ${pct(rows[0].ratio)} (${num(rows[0].returned)} of ${num(rows[0].orderUnits)} units).`
    );
  }
  const byReturns = [...rows].sort((a, b) => b.returned - a.returned || (a.sku < b.sku ? -1 : 1)).slice(0, 10);
  if (byReturns[0]) {
    insights.push(`Most returned units: ${byReturns[0].sku} (${num(byReturns[0].returned)} units).`);
  }
  if (olderLines > 0) {
    insights.push(
      `${num(olderLines)} return line(s) (${num(olderUnits)} units) are for orders that are not in the Orders file (older orders). They are still counted, so some ratios can look higher than they really are.`
    );
  }
  const above100 = rows.filter((r) => r.ratio > 1).length;
  if (above100 > 0) {
    insights.push(`${num(above100)} SKU(s) have a ratio above 100% because their returns are more than the orders in this file.`);
  }
  if (unmatched.length > 0) {
    insights.push(
      `${num(unmatched.length)} SKU(s) have returns but no orders in the Orders file, so no ratio could be calculated: ${unmatched
        .slice(0, 10)
        .join(", ")}${unmatched.length > 10 ? ", ..." : ""}. Check that the Orders file covers the right dates.`
    );
  }
  if (!options.excludeCancelled && stats.cancelledUnits > 0) {
    insights.push(
      `Orders include ${num(stats.cancelledUnits)} cancelled unit(s). Turn on "Leave out cancelled orders" in Options to calculate the ratio without them.`
    );
  }

  const top10Ratio = rows.slice(0, 10);
  const charts: ReportChart[] = [
    {
      type: "hbar",
      title: "Top 10 SKUs by Return Ratio",
      subtitle: "Higher = more of the units sold came back",
      labels: top10Ratio.map((r) => r.sku),
      series: [{ name: "Return Ratio (%)", data: top10Ratio.map((r) => round2(r.ratio * 100)) }],
      unit: "%",
      color: "rose",
    },
    {
      type: "bar",
      title: "Orders vs Returns",
      subtitle: "Top 10 SKUs by returned units",
      labels: byReturns.map((r) => r.sku),
      series: [
        { name: "Orders", data: byReturns.map((r) => r.orderUnits) },
        { name: "Returns", data: byReturns.map((r) => r.returned) },
      ],
      color: "indigo",
    },
  ];

  return {
    title: titleWithReturnFilter("Flipkart SKU Return Ratio Report", info),
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Units Sold", value: num(totalUnits) },
      { label: "Units Returned", value: num(matchedReturns) },
      { label: "Overall Return Ratio", value: pct(overall), helpText: "Returned units / all units sold" },
      { label: "SKUs With Returns", value: num(rows.length) },
    ],
    tables: [
      {
        title: "SKU Return Ratio (Orders high to low, then Return Ratio high to low)",
        columns: ["SKU", "Orders", "Return Qty", "Return Ratio (%)"],
        rows: rows.map((r) => [r.sku, r.orderUnits, r.returned, round2(r.ratio * 100)]),
        previewRows: 10,
      },
    ],
    charts,
    insights,
  };
}
