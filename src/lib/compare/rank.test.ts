import { describe, expect, it } from "vitest";
import { rank } from "./rank";

describe("rank", () => {
  it("marks the lowest and the highest of two", () => {
    expect(rank([13950, 21950])).toEqual(["low", "high"]);
    expect(rank([21950, 13950])).toEqual(["high", "low"]);
  });

  it("marks the extremes of three, and the one between as mid", () => {
    expect(rank([2018, 2023, 2019])).toEqual(["low", "high", "mid"]);
  });

  it("marks nothing when all are the same, or when fewer than two cars have the number", () => {
    expect(rank([1.0, 1.0])).toEqual([undefined, undefined]);
    expect(rank([5000, undefined])).toEqual([undefined, undefined]);
    expect(rank([undefined, undefined])).toEqual([undefined, undefined]);
    expect(rank([])).toEqual([]);
  });

  it("skips a car with no value but still ranks the others", () => {
    expect(rank([100000, undefined, 60000])).toEqual(["high", undefined, "low"]);
  });

  it("two cars tied at the lowest are both low", () => {
    expect(rank([10, 10, 30])).toEqual(["low", "low", "high"]);
  });
});
