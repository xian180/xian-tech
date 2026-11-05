// ---------------------------------------------------------------------------
// SKU Return Ratio (Amazon).
//   Orders          = units sold per SKU (from the Orders file)
//   Return quantity = returned units per Merchant SKU (from the Returns file)
//   Return Ratio    = Return quantity / Orders
// Sorted by Orders (high -> low) first, then by Return Ratio (high -> low).
// Only SKUs that appear in the Returns file are listed.
// ---------------------------------------------------------------------------

import type { ReportResult } from "../../types";
import type { ParsedTable } from "../readTable";
import { RETURN_COLUMNS, assertColumns, parseNumber } from "./adapter";
import { loadOrderLines } from "./orders";
import { DEFAULT_OPTIONS, type AmazonOptions } from "./options";
import { DateRange, addTo, num, parseDateLoose, round2 } from "./util";
import type { ReportChart } from "../../types";

export function buildReturnRatio(
  orders: ParsedTable,
  returns: ParsedTable,
  options: AmazonOptions = DEFAULT_OPTIONS
): ReportResult {
  const { lines, stats } = loadOrderLines(orders, options);
  const cols = assertColumns(returns, RETURN_COLUMNS, "Returns");

  const unitsBySku = new Map<string, number>();
  let totalUnits = 0;
  for (const l of lines) {
    addTo(unitsBySku, l.sku, l.qty);
    totalUnits += l.qty;
  }

  const returnsBySku = new Map<string, number>();
  const returnDates = new DateRange();
  let rejectedRows = 0;
  let rejectedUnits = 0;
  for (const row of returns.rows) {
    const sku = (row[cols.sku!] ?? "").trim();
    const qty = parseNumber(row[cols.returnQty!]);
    if (!sku) continue;
    returnDates.add(parseDateLoose(cols.returnDate ? row[cols.returnDate] : undefined));
    const isRejected = /rejected/i.test((cols.returnType ? row[cols.returnType] : "") ?? "");
    if (isRejected) {
      rejectedRows++;
      rejectedUnits += qty;
      if (options.excludeRejectedReturns) continue;
    }
    addTo(returnsBySku, sku, qty);
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
  const orderPeriod = stats.dates.label();
  const returnPeriod = returnDates.label();
  if (orderPeriod) insights.push(`Orders file period: ${orderPeriod}.`);
  if (returnPeriod) {
    insights.push(
      `Return requests period: ${returnPeriod}. The ratio is most accurate when both periods cover the same orders.`
    );
  }
  if (rows[0]) {
    insights.push(
      `Highest return ratio: ${rows[0].sku} at ${pct(rows[0].ratio)} (${num(rows[0].returned)} of ${num(rows[0].orderUnits)} units).`
    );
  }
  const byReturns = [...rows].sort((a, b) => b.returned - a.returned || (a.sku < b.sku ? -1 : 1)).slice(0, 10);
  const mostReturned = byReturns[0];
  if (mostReturned) {
    insights.push(`Most returned units: ${mostReturned.sku} (${num(mostReturned.returned)} units).`);
  }
  if (unmatched.length > 0) {
    insights.push(
      `${num(unmatched.length)} SKU(s) have returns but no orders in the Orders file, so no ratio could be calculated: ${unmatched
        .slice(0, 10)
        .join(", ")}${unmatched.length > 10 ? ", ..." : ""}. Check that the Orders file covers the right dates.`
    );
  }
  if (!options.excludeRejectedReturns && rejectedRows > 0) {
    insights.push(
      `${num(rejectedRows)} return line(s) (${num(rejectedUnits)} units) are marked "Rejected" and are still counted. You can leave them out from Options.`
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
    title: "SKU Return Ratio Report",
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
