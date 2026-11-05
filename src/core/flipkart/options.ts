/** User-switchable rules for the Flipkart reports. */
export interface FlipkartOptions {
  /**
   * Leave out orders whose status is CANCELLED.
   * Default: false. How to treat cancelled orders is still a pending decision
   * for all marketplaces, so for now Flipkart counts every status (this is
   * exactly what the manual Excel does).
   */
  excludeCancelled: boolean;
  /** Leave out returns whose return_status is "cancelled". Default: false */
  excludeCancelledReturns: boolean;
}

export const DEFAULT_FLIPKART_OPTIONS: FlipkartOptions = {
  excludeCancelled: false,
  excludeCancelledReturns: false,
};
