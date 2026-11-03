// ---------------------------------------------------------------------------
// SKU / State Sales Report (Amazon).
//   Orders  = sum of `quantity`
//   Revenue = sum of `item-price`
// grouped by SKU and by ship-state. Cancelled orders are excluded by default.
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { loadOrderLines } from "./orders";
import { DEFAULT_OPTIONS, type AmazonOptions } from "./options";
import { addTo, barChart, inr, num, round2, sortDesc } from "./util";

export function buildSalesReport(orders: ParsedTable, options: AmazonOptions = DEFAULT_OPTIONS): ReportResult {
  const { lines, stats } = loadOrderLines(orders, options);

  const skuUnits = new Map<string, number>();
  const skuRevenue = new Map<string, number>();
  const stateUnits = new Map<string, number>();
  const stateRevenue = new Map<string, number>();
  let totalUnits = 0;
  let totalRevenue = 0;

  for (const l of lines) {
    addTo(skuUnits, l.sku, l.qty);
    addTo(skuRevenue, l.sku, l.price);
    addTo(stateUnits, l.state, l.qty);
    addTo(stateRevenue, l.state, l.price);
    totalUnits += l.qty;
    totalRevenue += l.price;
  }

  // Keep only SKUs / states that actually sold something in the "orders" tables.
  const skuUnitsSorted = sortDesc(skuUnits).filter(([, v]) => v > 0);
  const skuRevenueSorted = sortDesc(skuRevenue).filter(([, v]) => v > 0);
  const stateUnitsSorted = sortDesc(stateUnits).filter(([, v]) => v > 0);
  const stateRevenueSorted = sortDesc(stateRevenue).filter(([, v]) => v > 0);

  const insights: string[] = [];
  const period = stats.dates.label();
  if (period) insights.push(`Orders in this file are from ${period}.`);
  if (skuUnitsSorted[0]) insights.push(`Best-selling SKU: ${skuUnitsSorted[0][0]} (${num(skuUnitsSorted[0][1])} units).`);
  if (skuRevenueSorted[0]) insights.push(`Highest-revenue SKU: ${skuRevenueSorted[0][0]} (${inr(skuRevenueSorted[0][1])}).`);
  if (stateUnitsSorted[0]) insights.push(`Top state by orders: ${stateUnitsSorted[0][0]} (${num(stateUnitsSorted[0][1])} units).`);
  if (stateRevenueSorted[0]) insights.push(`Top state by revenue: ${stateRevenueSorted[0][0]} (${inr(stateRevenueSorted[0][1])}).`);
  if (options.excludeCancelled && stats.cancelledRows > 0) {
    insights.push(
      `${num(stats.cancelledRows)} cancelled order line(s) were left out (${inr(stats.cancelledPrice)} of price not counted).`
    );
  }
  if (!options.excludeCancelled && stats.cancelledRows > 0) {
    insights.push(
      `Note: ${num(stats.cancelledRows)} cancelled order line(s) are included (${inr(stats.cancelledPrice)} of price counted in revenue).`
    );
  }
  if (!options.excludeReturnedToSeller && stats.returnedToSellerRows > 0) {
    insights.push(
      `${num(stats.returnedToSellerRows)} order line(s) are "Returned to Seller" and are still counted as sales. You can leave them out from Options.`
    );
  }

  return {
    title: "SKU & State Sales Report",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Units Sold", value: num(totalUnits) },
      { label: "Total Revenue", value: inr(totalRevenue) },
      { label: "SKUs Sold", value: num(skuUnitsSorted.length) },
      { label: "States Reached", value: num(stateUnitsSorted.length) },
      {
        label: options.excludeCancelled ? "Cancelled Lines Left Out" : "Cancelled Lines Counted",
        value: num(stats.cancelledRows),
        helpText: stats.cancelledRows > 0 ? `Price: ${inr(stats.cancelledPrice)}` : undefined,
      },
    ],
    tables: [
      { title: "SKU Wise Orders", columns: ["SKU", "Orders"], rows: skuUnitsSorted },
      { title: "SKU Wise Revenue", columns: ["SKU", "Revenue (Rs.)"], rows: skuRevenueSorted.map(([k, v]) => [k, round2(v)]) },
      { title: "State Wise Orders", columns: ["State", "Orders"], rows: stateUnitsSorted },
      { title: "State Wise Revenue", columns: ["State", "Revenue (Rs.)"], rows: stateRevenueSorted.map(([k, v]) => [k, round2(v)]) },
    ],
    charts: [
      barChart("Top 10 SKUs by Orders", "Orders", skuUnitsSorted),
      barChart("Top 10 SKUs by Revenue (Rs.)", "Revenue", skuRevenueSorted),
      barChart("Top 10 States by Orders", "Orders", stateUnitsSorted),
      barChart("Top 10 States by Revenue (Rs.)", "Revenue", stateRevenueSorted),
    ],
    insights,
  };
}
