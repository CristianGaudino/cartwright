import { describe, expect, it } from "vitest";
import { countable, figureAt, parseFigure } from "./tween-number";

describe("tween-number", () => {
  it("splits a figure into its number and words", () => {
    expect(parseFigure("€5,864,950")).toEqual({ before: "€", n: 5864950, decimals: 0, grouped: true, after: "" });
    expect(parseFigure("124 cars")).toEqual({ before: "", n: 124, decimals: 0, grouped: false, after: " cars" });
    expect(parseFigure("4.6")).toMatchObject({ n: 4.6, decimals: 1 });
    expect(parseFigure("3 of 12")).toBeNull();
    expect(parseFigure("Not set")).toBeNull();
  });

  it("counts only when the words stay the same", () => {
    expect(countable(parseFigure("12 cars"), parseFigure("124 cars"))).toBe(true);
    expect(countable(parseFigure("1 car"), parseFigure("2 cars"))).toBe(false);
    expect(countable(parseFigure("€300"), parseFigure("€300"))).toBe(false);
    expect(countable(parseFigure("€300"), null)).toBe(false);
  });

  it("starts on the old value, ends exactly on the new one, and groups thousands on the way", () => {
    const from = parseFigure("€950")!;
    const to = parseFigure("€1,200")!;
    expect(figureAt(from, to, 0)).toBe("€950");
    expect(figureAt(from, to, 1)).toBe("€1,200");
    expect(figureAt(from, to, 0.5)).toMatch(/^€1,1\d\d$/);
    expect(figureAt(parseFigure("4.1")!, parseFigure("4.6")!, 1)).toBe("4.6");
  });
});
