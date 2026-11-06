import type { OrderGroup } from "../subFilter";

/** Flipkart order_item_status values that count as a return (decided: all return statuses). */
const RETURN_STATUSES = new Set(["RETURNED", "RETURN_REQUESTED"]);

/** Which sub-filter group a Flipkart order line belongs to. */
export function flipkartOrderGroup(status: string): OrderGroup {
  const s = status.trim().toUpperCase();
  if (s === "CANCELLED") return "cancelled";
  if (RETURN_STATUSES.has(s)) return "returned";
  return "normal";
}
