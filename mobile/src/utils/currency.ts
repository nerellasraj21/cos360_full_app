/**
 * Currency formatting utilities for INR (Indian Rupee).
 * Matches the web frontend display format.
 */

/**
 * Format a number as Indian Rupee currency string.
 * e.g. 12345.6 → "₹12,345.60"
 */
export function formatINR(amount: number | string | undefined | null): string {
  const num = Number(amount ?? 0);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parse an INR-formatted string back to a number.
 * e.g. "₹12,345.60" → 12345.6
 */
export function parseINR(value: string): number {
  return parseFloat(value.replace(/[₹,]/g, '')) || 0;
}

/**
 * Format as compact INR for space-constrained UI.
 * e.g. 125000 → "₹1.25L", 1500000 → "₹15L", 12345 → "₹12,345"
 */
export function formatINRCompact(amount: number | string | undefined | null): string {
  const num = Number(amount ?? 0);
  if (isNaN(num)) return '₹0';
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  return `₹${num}`;
}
