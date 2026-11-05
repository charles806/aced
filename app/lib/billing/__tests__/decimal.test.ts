import { describe, it, expect } from "vitest";
import { decimalStringToMinor, minorToDecimalString, validateDecimalAmount, getCurrencyPrecision } from "../decimal";

describe("decimal utilities", () => {
  it("converts USD 19.99 to 1999 minor units", () => {
    expect(decimalStringToMinor("19.99", "USD")).toBe(1999);
  });

  it("rejects excessive decimal precision", () => {
    expect(() => decimalStringToMinor("19.999", "USD")).toThrow("Amount precision exceeds");
  });

  it("rejects malformed amounts", () => {
    expect(() => decimalStringToMinor("19.9a", "USD")).toThrow("Invalid amount format");
    expect(() => decimalStringToMinor("-1", "USD")).toThrow("Invalid amount format");
    expect(() => decimalStringToMinor("", "USD")).toThrow("Invalid amount format");
  });

  it("rejects unsupported currency", () => {
    expect(() => decimalStringToMinor("10", "ABC")).toThrow("Unsupported currency");
  });

  it("handles zero safely", () => {
    expect(decimalStringToMinor("0", "USD")).toBe(0);
    expect(decimalStringToMinor("0.00", "USD")).toBe(0);
  });

  it("rejects excessive frac length >6", () => {
    expect(() => decimalStringToMinor("1.1234567", "USD")).toThrow("Excessive decimal precision");
  });

  it("converts back to decimal string", () => {
    expect(minorToDecimalString(1999, "USD")).toBe("19.99");
  });

  it("validates amount", () => {
    expect(() => validateDecimalAmount("19.99", "USD")).not.toThrow();
    expect(() => validateDecimalAmount("19.999", "USD")).toThrow();
  });

  it("uses currency precision", () => {
    expect(getCurrencyPrecision("ngn")).toBe(2);
  });
});
