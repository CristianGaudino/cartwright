import { describe, expect, it } from "vitest";
import { quote } from "./payment";

// Vectors from research section 7, worked out with the same formula.
describe("quote", () => {
  it("gives the well-known 304.22 for 10,000 at 6% over 36 months", () => {
    expect(quote(10000, 0, 36, 6)?.monthlyEur).toBe(304.22);
  });

  it("derives total and interest from the rounded monthly figure", () => {
    expect(quote(20000, 0, 48, 7.9)).toEqual({ monthlyEur: 487.32, borrowedEur: 20000, totalEur: 23391.36, interestEur: 3391.36 });
  });

  it("divides by the term at 0% APR", () => {
    expect(quote(15000, 3000, 48, 0)).toEqual({ monthlyEur: 250, borrowedEur: 12000, totalEur: 12000, interestEur: 0 });
  });

  it("gives 317.97 for 15,000 at 9.9% over 60 months", () => {
    expect(quote(15000, 0, 60, 9.9)?.monthlyEur).toBe(317.97);
  });

  it.each([
    ["deposit equal to the price", 15000, 15000, 48, 9.9],
    ["deposit above the price", 15000, 16000, 48, 9.9],
    ["a negative deposit", 15000, -1, 48, 9.9],
    ["APR 31", 15000, 0, 48, 31],
    ["a negative APR", 15000, 0, 48, -1],
    ["price 999", 999, 0, 48, 9.9],
    ["price 250,001", 250001, 0, 48, 9.9],
    ["term 0", 15000, 0, 0, 9.9],
    ["a part month", 15000, 0, 12.5, 9.9],
    ["NaN APR", 15000, 0, 48, NaN],
    ["NaN deposit", 15000, NaN, 48, 9.9],
  ])("is null for %s", (_, price, deposit, term, apr) => {
    expect(quote(price, deposit, term, apr)).toBeNull();
  });

  it("takes the range edges", () => {
    expect(quote(1000, 0, 12, 0)?.monthlyEur).toBe(83.33);
    expect(quote(250000, 0, 60, 30)).not.toBeNull();
  });
});
