/** User-switchable rules for the Flipkart reports. */
export interface FlipkartOptions {
  /**
   * Leave out orders whose status is CANCELLED.
   * Always false now: the page switch was removed. The Orders report uses the
   * sub-filter (All / Without return / Without return and cancellation) instead.
   * The field stays so the other Flipkart reports keep compiling.
   */
  excludeCancelled: boolean;
  /** Leave out returns whose return_status is "cancelled". Default: false */
  excludeCancelledReturns: boolean;
}

export const DEFAULT_FLIPKART_OPTIONS: FlipkartOptions = {
  excludeCancelled: false,
  excludeCancelledReturns: false,
};
