import type { ReportConfig } from "@/types";

// ---------------------------------------------------------------------------
// Default / seed report definitions.
//
// Each report is a fully independent Python script. The Python execution
// engine (src/lib/pyodideEngine.ts) loads the uploaded Excel workbook into
// pandas and calls the script's `run_report(file_path)` function. The script
// returns a plain dictionary describing summary cards, tables, charts and
// insights — the frontend never hardcodes any business calculation, it only
// renders whatever structure the Python script produces.
//
// Admins can edit, replace or add new scripts from the Admin panel without
// touching any frontend code.
// ---------------------------------------------------------------------------

const RETURN_REPORT_PY = `import pandas as pd


def run_report(file_path):
    """Analyze returns, RTOs and refunds from a marketplace order export."""
    df = pd.read_excel(file_path)
    df.columns = [str(c).strip() for c in df.columns]

    def col(name):
        for c in df.columns:
            if c.strip().lower() == name.strip().lower():
                return c
        return None

    status_col = col("Order Status")
    qty_col = col("Quantity")
    product_col = col("Product Name")
    market_col = col("Marketplace")
    reason_col = col("Return Reason")
    price_col = col("Selling Price")

    if status_col is None:
        raise ValueError("Required column 'Order Status' was not found in the uploaded file.")

    df[status_col] = df[status_col].astype(str).str.strip()
    total_orders = len(df)

    return_keywords = ["return", "rto", "refund"]
    is_return = df[status_col].str.lower().apply(lambda s: any(k in s for k in return_keywords))
    returns_df = df[is_return]
    total_returns = int(is_return.sum())
    return_rate = (total_returns / total_orders * 100) if total_orders else 0

    qty_returned = int(pd.to_numeric(returns_df[qty_col], errors="coerce").fillna(0).sum()) if qty_col else total_returns

    lost_value = 0.0
    if price_col:
        prices = pd.to_numeric(returns_df[price_col], errors="coerce").fillna(0)
        if qty_col:
            qtys = pd.to_numeric(returns_df[qty_col], errors="coerce").fillna(0)
            lost_value = float((prices * qtys).sum())
        else:
            lost_value = float(prices.sum())

    summary = [
        {"label": "Total Orders", "value": total_orders},
        {"label": "Total Returns", "value": total_returns},
        {"label": "Return Rate", "value": f"{return_rate:.2f}%"},
        {"label": "Units Returned", "value": qty_returned},
    ]
    if price_col:
        summary.append({"label": "Value Lost to Returns", "value": f"Rs. {lost_value:,.2f}"})

    tables = []
    charts = []
    market_group = None
    product_group = None

    if market_col:
        market_group = returns_df.groupby(market_col).size().sort_values(ascending=False)
        tables.append({
            "title": "Returns by Marketplace",
            "columns": ["Marketplace", "Returns"],
            "rows": [[str(k), int(v)] for k, v in market_group.items()],
        })
        if len(market_group):
            charts.append({
                "type": "pie",
                "title": "Return Share by Marketplace",
                "labels": [str(k) for k in market_group.index],
                "series": [{"name": "Returns", "data": [int(v) for v in market_group.values]}],
            })

    if product_col:
        product_group = returns_df.groupby(product_col).size().sort_values(ascending=False).head(10)
        tables.append({
            "title": "Top 10 Returned Products",
            "columns": ["Product", "Returns"],
            "rows": [[str(k), int(v)] for k, v in product_group.items()],
        })
        if len(product_group):
            charts.append({
                "type": "bar",
                "title": "Top Returned Products",
                "labels": [str(k) for k in product_group.index],
                "series": [{"name": "Returns", "data": [int(v) for v in product_group.values]}],
            })

    if reason_col:
        reasons = returns_df[reason_col].fillna("Not Specified").astype(str).str.strip()
        reasons = reasons.replace("", "Not Specified").value_counts().head(10)
        if len(reasons):
            tables.append({
                "title": "Top Return Reasons",
                "columns": ["Reason", "Count"],
                "rows": [[str(k), int(v)] for k, v in reasons.items()],
            })

    insights = [f"{return_rate:.2f}% of all orders were returned, cancelled or sent back (RTO)."]
    if market_group is not None and len(market_group):
        insights.append(f"'{market_group.index[0]}' has the highest number of returns ({int(market_group.iloc[0])}).")
    if product_group is not None and len(product_group):
        insights.append(f"'{product_group.index[0]}' is the most frequently returned product.")
    if price_col:
        insights.append(f"Estimated revenue impact from returns is Rs. {lost_value:,.2f}.")

    return {
        "title": "Return Report",
        "summary": summary,
        "tables": tables,
        "charts": charts,
        "insights": insights,
    }
`;

const SALES_REPORT_PY = `import pandas as pd


def run_report(file_path):
    """Analyze total sales, revenue trends and top performers."""
    df = pd.read_excel(file_path)
    df.columns = [str(c).strip() for c in df.columns]

    def col(name):
        for c in df.columns:
            if c.strip().lower() == name.strip().lower():
                return c
        return None

    order_col = col("Order ID")
    date_col = col("Order Date")
    market_col = col("Marketplace")
    product_col = col("Product Name")
    qty_col = col("Quantity")
    price_col = col("Selling Price")
    status_col = col("Order Status")

    if price_col is None or qty_col is None:
        raise ValueError("Required columns 'Selling Price' and 'Quantity' were not found in the uploaded file.")

    work = df.copy()
    if status_col:
        normalized = work[status_col].astype(str).str.strip().str.lower()
        exclude = ["cancelled", "canceled", "returned", "rto", "refunded"]
        work = work[~normalized.isin(exclude)]

    work[qty_col] = pd.to_numeric(work[qty_col], errors="coerce").fillna(0)
    work[price_col] = pd.to_numeric(work[price_col], errors="coerce").fillna(0)
    work["__revenue"] = work[qty_col] * work[price_col]

    total_orders = int(work[order_col].nunique()) if order_col else len(work)
    total_revenue = float(work["__revenue"].sum())
    total_units = float(work[qty_col].sum())
    aov = total_revenue / total_orders if total_orders else 0

    summary = [
        {"label": "Total Revenue", "value": f"Rs. {total_revenue:,.2f}"},
        {"label": "Total Orders", "value": total_orders},
        {"label": "Units Sold", "value": int(total_units)},
        {"label": "Average Order Value", "value": f"Rs. {aov:,.2f}"},
    ]

    tables = []
    charts = []
    market_group = None
    product_group = None

    if market_col:
        market_group = work.groupby(market_col)["__revenue"].sum().sort_values(ascending=False)
        tables.append({
            "title": "Revenue by Marketplace",
            "columns": ["Marketplace", "Revenue"],
            "rows": [[str(k), round(float(v), 2)] for k, v in market_group.items()],
        })
        if len(market_group):
            charts.append({
                "type": "pie",
                "title": "Revenue Share by Marketplace",
                "labels": [str(k) for k in market_group.index],
                "series": [{"name": "Revenue", "data": [round(float(v), 2) for v in market_group.values]}],
            })

    if product_col:
        product_group = work.groupby(product_col)["__revenue"].sum().sort_values(ascending=False).head(10)
        tables.append({
            "title": "Top 10 Products by Revenue",
            "columns": ["Product", "Revenue"],
            "rows": [[str(k), round(float(v), 2)] for k, v in product_group.items()],
        })
        if len(product_group):
            charts.append({
                "type": "bar",
                "title": "Top Products by Revenue",
                "labels": [str(k) for k in product_group.index],
                "series": [{"name": "Revenue", "data": [round(float(v), 2) for v in product_group.values]}],
            })

    if date_col:
        work["__month"] = pd.to_datetime(work[date_col], errors="coerce").dt.to_period("M").astype(str)
        monthly = work[work["__month"] != "NaT"].groupby("__month")["__revenue"].sum().sort_index()
        if len(monthly):
            tables.append({
                "title": "Monthly Sales Trend",
                "columns": ["Month", "Revenue"],
                "rows": [[str(k), round(float(v), 2)] for k, v in monthly.items()],
            })
            charts.append({
                "type": "line",
                "title": "Monthly Revenue Trend",
                "labels": [str(k) for k in monthly.index],
                "series": [{"name": "Revenue", "data": [round(float(v), 2) for v in monthly.values]}],
            })

    insights = [f"Total sales revenue across all channels is Rs. {total_revenue:,.2f} from {total_orders} orders."]
    if market_group is not None and len(market_group):
        insights.append(f"'{market_group.index[0]}' is the top performing marketplace by revenue.")
    if product_group is not None and len(product_group):
        insights.append(f"'{product_group.index[0]}' is the best-selling product by revenue.")
    insights.append(f"Average order value is Rs. {aov:,.2f}.")

    return {
        "title": "Sales Report",
        "summary": summary,
        "tables": tables,
        "charts": charts,
        "insights": insights,
    }
`;

const PROFIT_ANALYSIS_PY = `import pandas as pd


def run_report(file_path):
    """Estimate gross profit using selling price vs. cost price."""
    df = pd.read_excel(file_path)
    df.columns = [str(c).strip() for c in df.columns]

    def col(name):
        for c in df.columns:
            if c.strip().lower() == name.strip().lower():
                return c
        return None

    qty_col = col("Quantity")
    price_col = col("Selling Price")
    cost_col = col("Cost Price")
    product_col = col("Product Name")
    market_col = col("Marketplace")

    if price_col is None or cost_col is None or qty_col is None:
        raise ValueError("Required columns 'Selling Price', 'Cost Price' and 'Quantity' were not found.")

    work = df.copy()
    work[qty_col] = pd.to_numeric(work[qty_col], errors="coerce").fillna(0)
    work[price_col] = pd.to_numeric(work[price_col], errors="coerce").fillna(0)
    work[cost_col] = pd.to_numeric(work[cost_col], errors="coerce").fillna(0)
    work["__revenue"] = work[qty_col] * work[price_col]
    work["__cost"] = work[qty_col] * work[cost_col]
    work["__profit"] = work["__revenue"] - work["__cost"]

    total_revenue = float(work["__revenue"].sum())
    total_profit = float(work["__profit"].sum())
    margin = (total_profit / total_revenue * 100) if total_revenue else 0

    summary = [
        {"label": "Total Revenue", "value": f"Rs. {total_revenue:,.2f}"},
        {"label": "Total Profit", "value": f"Rs. {total_profit:,.2f}"},
        {"label": "Profit Margin", "value": f"{margin:.2f}%"},
    ]

    tables = []
    charts = []
    if product_col:
        group = work.groupby(product_col)["__profit"].sum().sort_values(ascending=False).head(10)
        tables.append({
            "title": "Top 10 Products by Profit",
            "columns": ["Product", "Profit"],
            "rows": [[str(k), round(float(v), 2)] for k, v in group.items()],
        })
        charts.append({
            "type": "bar",
            "title": "Top Products by Profit",
            "labels": [str(k) for k in group.index],
            "series": [{"name": "Profit", "data": [round(float(v), 2) for v in group.values]}],
        })

    if market_col:
        mgroup = work.groupby(market_col)["__profit"].sum().sort_values(ascending=False)
        tables.append({
            "title": "Profit by Marketplace",
            "columns": ["Marketplace", "Profit"],
            "rows": [[str(k), round(float(v), 2)] for k, v in mgroup.items()],
        })

    insights = [f"Overall profit margin is {margin:.2f}% on Rs. {total_revenue:,.2f} of revenue."]

    return {
        "title": "Profit Analysis",
        "summary": summary,
        "tables": tables,
        "charts": charts,
        "insights": insights,
    }
`;

export const DEFAULT_REPORTS: ReportConfig[] = [
  {
    id: "return-report",
    name: "Return Report",
    description:
      "Analyze returns, RTOs and refunds across marketplaces: return rate, top returned products and return reasons.",
    scriptName: "return_report.py",
    pythonCode: RETURN_REPORT_PY,
    requiredColumns: ["Order ID", "Order Status", "Product Name", "Quantity"],
    active: true,
    displayOrder: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sales-report",
    name: "Sales Report",
    description:
      "Understand total revenue, order volume, average order value, and top-selling products and marketplaces.",
    scriptName: "sales_report.py",
    pythonCode: SALES_REPORT_PY,
    requiredColumns: ["Order ID", "Order Date", "Product Name", "Quantity", "Selling Price"],
    active: true,
    displayOrder: 2,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "profit-analysis",
    name: "Profit Analysis",
    description:
      "Estimate gross profit and margin by comparing selling price against cost price, by product and marketplace.",
    scriptName: "profit_analysis.py",
    pythonCode: PROFIT_ANALYSIS_PY,
    requiredColumns: ["Product Name", "Quantity", "Selling Price", "Cost Price"],
    active: false,
    displayOrder: 3,
    updatedAt: new Date().toISOString(),
  },
];

/** Sample dataset (as array-of-objects) used by the Admin "Test Script" feature. */
export const SAMPLE_TEST_ROWS = [
  { "Order ID": "A1001", "Order Date": "2024-01-05", Marketplace: "Amazon", "Product Name": "Wireless Mouse", SKU: "WM-01", Quantity: 2, "Order Status": "Delivered", "Selling Price": 499, "Cost Price": 250, "Return Reason": "" },
  { "Order ID": "A1002", "Order Date": "2024-01-07", Marketplace: "Flipkart", "Product Name": "Bluetooth Speaker", SKU: "BS-02", Quantity: 1, "Order Status": "Returned", "Selling Price": 1299, "Cost Price": 700, "Return Reason": "Defective" },
  { "Order ID": "A1003", "Order Date": "2024-02-02", Marketplace: "Meesho", "Product Name": "Phone Case", SKU: "PC-03", Quantity: 3, "Order Status": "Delivered", "Selling Price": 199, "Cost Price": 80, "Return Reason": "" },
  { "Order ID": "A1004", "Order Date": "2024-02-11", Marketplace: "Amazon", "Product Name": "Wireless Mouse", SKU: "WM-01", Quantity: 1, "Order Status": "RTO", "Selling Price": 499, "Cost Price": 250, "Return Reason": "Customer unavailable" },
  { "Order ID": "A1005", "Order Date": "2024-02-20", Marketplace: "Myntra", "Product Name": "Cotton T-Shirt", SKU: "CT-04", Quantity: 4, "Order Status": "Delivered", "Selling Price": 699, "Cost Price": 320, "Return Reason": "" },
  { "Order ID": "A1006", "Order Date": "2024-03-03", Marketplace: "AJIO", "Product Name": "Running Shoes", SKU: "RS-05", Quantity: 1, "Order Status": "Cancelled", "Selling Price": 2499, "Cost Price": 1400, "Return Reason": "" },
  { "Order ID": "A1007", "Order Date": "2024-03-15", Marketplace: "Flipkart", "Product Name": "Bluetooth Speaker", SKU: "BS-02", Quantity: 2, "Order Status": "Delivered", "Selling Price": 1299, "Cost Price": 700, "Return Reason": "" },
  { "Order ID": "A1008", "Order Date": "2024-03-22", Marketplace: "Amazon", "Product Name": "Phone Case", SKU: "PC-03", Quantity: 1, "Order Status": "Returned", "Selling Price": 199, "Cost Price": 80, "Return Reason": "Size issue" },
];
