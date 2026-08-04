/**
 * Money Handling Utility Functions
 * Enforces integer smallest currency unit (paise for INR) to eliminate floating point issues.
 */

/**
 * Converts standard currency unit (Rupees) to integer sub-units (Paise).
 * Example: 499.50 -> 49950
 */
export function toPaise(amountInRupees: number | string): number {
  const numericVal = typeof amountInRupees === 'string' ? parseFloat(amountInRupees) : amountInRupees;
  if (isNaN(numericVal) || numericVal < 0) {
    throw new Error(`Invalid monetary amount: ${amountInRupees}`);
  }
  return Math.round(numericVal * 100);
}

/**
 * Converts integer sub-units (Paise) to formatted decimal string (Rupees).
 * Example: 49950 -> "499.50"
 */
export function toRupees(amountInPaise: number): string {
  if (isNaN(amountInPaise) || amountInPaise < 0) {
    throw new Error(`Invalid paise amount: ${amountInPaise}`);
  }
  return (amountInPaise / 100).toFixed(2);
}
