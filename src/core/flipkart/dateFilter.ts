// Date range for the Flipkart files:
//   Orders   -> order_date
//   Returns  -> return_requested_date (or return_approval_date when that is empty)
//   Payments -> Payment Date (the day Flipkart paid)

import type { ParsedTable } from "../readTable";
import { ReportInputError } from "../amazon/adapter";
import { parseDateLoose } from "../amazon/util";
import { DateFilter, DateFilterEmptyError, dateInRange, describeDateFilter, filterTableRows, isDateFilterOn, rowsDateLabel } from "../dateFilter";
import { FLIPKART_ORDER_COLUMNS, FLIPKART_RETURN_COLUMNS, assertFlipkartColumns } from "./adapter";
import type { PaymentFile } from "./payments";

export function filterFlipkartOrders(table: ParsedTable, f: DateFilter): ParsedTable {
  if (!isDateFilterOn(f)) return table;
  const col = assertFlipkartColumns(table, FLIPKART_ORDER_COLUMNS, "Orders").orderDate;
  if (!col) throw new ReportInputError("The Orders file has no order_date column, so the dates cannot be filtered.");
  return filterTableRows(table, (r) => r[col] ?? "", f, "orders");
}

export function filterFlipkartReturns(table: ParsedTable, f: DateFilter): ParsedTable {
  if (!isDateFilterOn(f)) return table;
  const cols = assertFlipkartColumns(table, FLIPKART_RETURN_COLUMNS, "Returns");
  const requested = cols.returnRequestedDate;
  const approval = cols.returnApprovalDate;
  if (!requested && !approval) {
    throw new ReportInputError("The Returns file has no return date column, so the dates cannot be filtered.");
  }
  const dateOf = (r: Record<string, string>) => ((requested && r[requested]) || (approval && r[approval]) || "").trim();
  return filterTableRows(table, dateOf, f, "returns");
}

/** Keeps only the payment rows (and ads rows) paid inside the dates, and recounts the taxes and ads. */
export function filterPaymentFiles(files: PaymentFile[], f: DateFilter): PaymentFile[] {
  if (!isDateFilterOn(f)) return files;
  const label = describeDateFilter(f);
  const out: PaymentFile[] = [];
  for (const file of files) {
    const lines = file.lines.filter((l) => dateInRange(parseDateLoose(l.date), f));
    const adsRows = file.adsRows.filter((a) => dateInRange(parseDateLoose(a.date), f));
    if (lines.length === 0 && adsRows.length === 0) continue;
    const tax = { tcs: 0, tds: 0, gstOnFees: 0 };
    for (const l of lines) {
      tax.tcs += l.tcs;
      tax.tds += l.tds;
      tax.gstOnFees += l.gstOnFees;
    }
    let ads: PaymentFile["ads"] = null;
    if (file.ads) {
      ads = { topup: 0, redeem: 0, refund: 0, gst: 0, rows: adsRows.length };
      for (const a of adsRows) {
        ads.topup += a.topup;
        ads.redeem += a.redeem;
        ads.refund += a.refund;
        ads.gst += a.gst;
      }
    }
    out.push({
      ...file,
      lines,
      adsRows,
      tax,
      ads,
      dateFilter: label,
      // Flipkart's Summary covers the whole file, so it cannot be compared with a part of it
      summarySale: null,
      summaryRefund: null,
      summaryTax: { tcs: null, tds: null, gstOnFees: null, gstOnAds: null, adsFees: null, credit: null },
    });
  }
  if (out.length === 0) {
    const have = rowsDateLabel(
      files.flatMap((x) => x.lines.map((l) => ({ d: l.date }))) as unknown as Record<string, string>[],
      (r) => r.d
    );
    throw new DateFilterEmptyError(
      `No payments found ${label}.${have ? ` The payment files cover ${have}.` : ""}`
    );
  }
  return out;
}

/** What dates the uploaded files cover, e.g. ["Orders: 01 Aug 2026 to 03 Nov 2026", ...]. */
export function flipkartCoverage(orders: ParsedTable, returns: ParsedTable | null, payments: PaymentFile[] | null): string[] {
  const out: string[] = [];
  const oc = assertFlipkartColumns(orders, FLIPKART_ORDER_COLUMNS, "Orders").orderDate;
  const o = oc ? rowsDateLabel(orders.rows, (r) => r[oc] ?? "") : null;
  if (o) out.push(`Orders: ${o}`);
  if (returns) {
    const rc = assertFlipkartColumns(returns, FLIPKART_RETURN_COLUMNS, "Returns");
    const a = rc.returnRequestedDate;
    const b = rc.returnApprovalDate;
    const r = rowsDateLabel(returns.rows, (row) => ((a && row[a]) || (b && row[b]) || "").trim());
    if (r) out.push(`Returns: ${r}`);
  }
  if (payments && payments.length > 0) {
    const p = rowsDateLabel(
      payments.flatMap((x) => x.lines.map((l) => ({ d: l.date }))) as unknown as Record<string, string>[],
      (r) => r.d
    );
    if (p) out.push(`Payments: ${p}`);
  }
  return out;
}
