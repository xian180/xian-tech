// ---------------------------------------------------------------------------
// Built-in dummy Amazon files used by the "Try with sample data" button.
// They contain no real customer data and let anyone see the dashboard instantly.
// ---------------------------------------------------------------------------

import ordersText from "./samples/sample-amazon-orders.txt?raw";
import returnsText from "./samples/sample-amazon-returns.tsv?raw";

export function getSampleFiles(): { orders: File; returns: File } {
  return {
    orders: new File([ordersText], "Sample_Amazon_Orders.txt", { type: "text/plain" }),
    returns: new File([returnsText], "Sample_Amazon_Returns.tsv", { type: "text/tab-separated-values" }),
  };
}
