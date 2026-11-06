// ---------------------------------------------------------------------------
// Sub-filter for order reports (common for every marketplace).
//   All                              -> every order line (return + cancelled too)
//   Without return                   -> returned lines left out
//   Without return and cancellation  -> returned and cancelled lines left out
// Each marketplace adapter only has to say which group an order line belongs
// to (see core/flipkart/orderGroup.ts). A filter whose group has no data is
// not offered at all.
// ---------------------------------------------------------------------------

export type OrderGroup = "normal" | "returned" | "cancelled";

export type SubFilterKey = "all" | "withoutReturn" | "withoutReturnAndCancelled";

/** Units in each group (before any sub-filter is applied) */
export interface GroupUnits {
  normal: number;
  returned: number;
  cancelled: number;
}

export const EMPTY_GROUP_UNITS: GroupUnits = { normal: 0, returned: 0, cancelled: 0 };

export const SUB_FILTER_LABELS: Record<SubFilterKey, string> = {
  all: "All",
  withoutReturn: "Without return",
  withoutReturnAndCancelled: "Without return and cancellation",
};

/** Does an order line of this group stay in the report for this sub-filter? */
export function keepGroup(group: OrderGroup, key: SubFilterKey): boolean {
  if (key === "all") return true;
  if (key === "withoutReturn") return group !== "returned";
  return group === "normal";
}

/**
 * Sub-filters that make sense for this data, "all" first.
 * Only "all" => nothing to choose, so the bar is not shown.
 */
export function availableSubFilters(units: GroupUnits): SubFilterKey[] {
  const keys: SubFilterKey[] = ["all"];
  if (units.returned > 0) keys.push("withoutReturn");
  // With no cancelled data this would give the same numbers as "Without return"
  if (units.cancelled > 0) keys.push("withoutReturnAndCancelled");
  return keys;
}

/** Total units that stay for a sub-filter (shown on the button) */
export function unitsFor(units: GroupUnits, key: SubFilterKey): number {
  return (
    (keepGroup("normal", key) ? units.normal : 0) +
    (keepGroup("returned", key) ? units.returned : 0) +
    (keepGroup("cancelled", key) ? units.cancelled : 0)
  );
}
