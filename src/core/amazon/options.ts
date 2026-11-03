/** User-switchable rules for the Amazon reports. */
export interface AmazonOptions {
  /** Cancelled orders never count as sales (units or revenue). Default: true */
  excludeCancelled: boolean;
  /** Skip orders with status "Shipped - Returned to Seller". Default: false */
  excludeReturnedToSeller: boolean;
  /** Skip returns whose Return type is "Rejected". Default: false */
  excludeRejectedReturns: boolean;
}

export const DEFAULT_OPTIONS: AmazonOptions = {
  excludeCancelled: true,
  excludeReturnedToSeller: false,
  excludeRejectedReturns: false,
};
