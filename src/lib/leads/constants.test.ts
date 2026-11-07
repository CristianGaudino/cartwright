import { describe, expect, it } from "vitest";
import { tomorrow } from "./constants";

describe("tomorrow", () => {
  it("is the next Dublin calendar day", () => {
    expect(tomorrow(new Date("2026-11-07T12:00:00Z"))).toBe("2026-11-08");
    expect(tomorrow(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("is still the next day in the hour after the clocks go back (00:30 on 25 Oct 2026, Dublin)", () => {
    expect(tomorrow(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-26");
  });
});
