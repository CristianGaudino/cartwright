import { describe, expect, it } from "vitest";
import { carMeta, carName, carTitle, countLabel, formatKm, formatPrice } from "./format";
import type { Car } from "./types";

const audi: Car = {
  id: "101",
  slug: "audi-a4-2019-101",
  make: "Audi",
  makeSlug: "audi",
  model: "A4",
  modelSlug: "a4",
  variant: "2.0 TDI S line",
  year: 2019,
  priceEur: 18950,
  mileageKm: 84000,
  fuel: "diesel",
  gearbox: "manual",
  photos: [],
};

describe("formatters", () => {
  it("formats price and mileage as exact strings", () => {
    expect(formatPrice(18950)).toBe("€18,950");
    expect(formatKm(84000)).toBe("84,000 km");
  });

  it("builds the title and the name", () => {
    expect(carTitle(audi)).toBe("Audi A4 2.0 TDI S line");
    expect(carTitle({ ...audi, variant: undefined })).toBe("Audi A4");
    expect(carName(audi)).toBe("2019 Audi A4");
  });

  it("builds the meta line and drops missing parts with their separator", () => {
    expect(carMeta(audi)).toBe("2019 · 84,000 km · Diesel · Manual");
    expect(carMeta({ ...audi, mileageKm: undefined, fuel: undefined })).toBe("2019 · Manual");
  });

  it("labels the result count", () => {
    expect(countLabel(0)).toBe("No cars");
    expect(countLabel(1)).toBe("1 car");
    expect(countLabel(24)).toBe("24 cars");
  });
});
