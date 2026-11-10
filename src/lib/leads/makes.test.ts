import { describe, expect, it } from "vitest";
import { MAKE_OPTIONS } from "./makes";

describe("MAKE_OPTIONS", () => {
  const makes = MAKE_OPTIONS.slice(1).map((o) => o.label);
  it("starts with Any make, then the popular makes", () => {
    expect(MAKE_OPTIONS[0]).toEqual({ value: "", label: "Any make" });
    expect(makes.slice(0, 3)).toEqual(["Toyota", "Volkswagen", "Ford"]);
  });
  it("lists every make once, and the rest in A to Z", () => {
    expect(new Set(makes).size).toBe(makes.length);
    const rest = makes.slice(12);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });
});
