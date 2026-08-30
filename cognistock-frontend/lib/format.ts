/**
 * Format a rupee value for display.
 * Backend always returns raw rupees (e.g. 14999.95).
 * Never divide before passing here.
 */
export function formatRevenue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(2)}Cr`;
  if (value >= 1_00_000)  return `₹${(value / 1_00_000).toFixed(2)}L`;
  if (value >= 1_000)     return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(2)}`;
}

/**
 * Format a unit price — always show exact value with 2 decimal places.
 * Used for product price, supplier price, order unit price.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse a backend revenue string that might contain float precision errors.
 * e.g. "₹14999.949999999999" → "₹15,000.00"
 */
export function formatRevenueString(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? raw : formatRevenue(num);
}