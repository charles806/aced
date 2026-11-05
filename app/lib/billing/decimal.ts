export const CURRENCY_PRECISION: Record<string, number> = {
  USD: 2,
  NGN: 2,
  GHS: 2,
  KES: 2,
  ZAR: 2,
  EUR: 2,
  GBP: 2,
};

export function getCurrencyPrecision(currency: string): number {
  const upper = currency.toUpperCase();
  const precision = CURRENCY_PRECISION[upper];
  if (precision === undefined) {
    throw new Error(`Unsupported currency ${currency}`);
  }
  return precision;
}

export function decimalStringToMinor(amountStr: string, currency: string): number {
  if (typeof amountStr !== "string") throw new Error("Amount must be string");
  if (!/^\d+(\.\d+)?$/.test(amountStr)) throw new Error("Invalid amount format");
  const precision = getCurrencyPrecision(currency);
  if (amountStr.includes(".")) {
    const fracLen = amountStr.split(".")[1].length;
    if (fracLen > 6) throw new Error("Excessive decimal precision");
    if (fracLen > precision) throw new Error(`Amount precision exceeds ${precision} for ${currency}`);
  }
  const [whole, frac = ""] = amountStr.split(".");
  const normalizedFrac = (frac + "0".repeat(precision)).slice(0, precision);
  const minor = BigInt(whole) * BigInt(10 ** precision) + BigInt(normalizedFrac || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Amount too large");
  return Number(minor);
}

export function minorToDecimalString(minor: number, currency: string): string {
  const precision = getCurrencyPrecision(currency);
  const factor = 10 ** precision;
  const whole = Math.trunc(minor / factor);
  const frac = Math.abs(minor % factor).toString().padStart(precision, "0");
  return `${whole}.${frac}`;
}

export function validateDecimalAmount(amountStr: string, currency: string): void {
  getCurrencyPrecision(currency);
  decimalStringToMinor(amountStr, currency);
}
