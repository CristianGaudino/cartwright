import { describe, expect, it } from "vitest";
import { sourcingHref, sourcingPrefill } from "./sourcing-prefill";

describe("find a car, filled from a search", () => {
  it("takes the make, model, type and budget the form accepts", () => {
    expect(sourcingPrefill({ make: "volkswagen", model: "Golf", body: "suv", budget: "20000" })).toEqual({ make: "Volkswagen", model: "Golf", bodyType: "SUV", budgetMax: "20000" });
    expect(sourcingPrefill({ make: "citroen", body: "Estate" })).toEqual({ make: "Citroën", bodyType: "Estate" });
  });

  it("leaves out what the form would refuse", () => {
    expect(sourcingPrefill({ make: "not-a-make", body: "spaceship", budget: "21000", model: "x".repeat(61) })).toBeUndefined();
    expect(sourcingPrefill({ make: ["audi", "bmw"], model: "a\nb", budget: "0" })).toBeUndefined();
    expect(sourcingPrefill({})).toBeUndefined();
  });

  it("reads back what the no-cars link carries", () => {
    const href = sourcingHref({ make: "mercedes-benz", model: "C-Class", body: "saloon", budget: 15000 });
    expect(sourcingPrefill(Object.fromEntries(new URL(href, "https://x.ie").searchParams))).toEqual({ make: "Mercedes-Benz", model: "C-Class", bodyType: "Saloon", budgetMax: "15000" });
    expect(sourcingHref({})).toBe("/find-a-car");
  });
});
