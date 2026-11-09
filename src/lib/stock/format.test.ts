import { describe, expect, it } from "vitest";
import { carMeta, carName, carTitle, countLabel, formatKm, formatPrice, keyFacts, specRows } from "./format";
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
    expect(countLabel(1163)).toBe("1,163 cars");
  });
});

const full: Car = {
  ...audi,
  bodyType: "Saloon",
  engineLitres: 2,
  colour: "Grey",
  doors: 4,
  seats: 5,
  owners: 2,
  nctExpiry: "2027-07",
  maxSpeedMph: 126,
  zeroTo62Secs: 9.9,
};

describe("specRows", () => {
  it("lists every present spec in order with exact formats", () => {
    expect(specRows(full)).toEqual([
      { label: "Year", value: "2019" },
      { label: "Mileage", value: "84,000 km" },
      { label: "Fuel", value: "Diesel" },
      { label: "Transmission", value: "Manual" },
      { label: "Body type", value: "Saloon" },
      { label: "Engine", value: "2.0 L" },
      { label: "Colour", value: "Grey" },
      { label: "Doors", value: "4" },
      { label: "Seats", value: "5" },
      { label: "Owners", value: "2" },
      { label: "NCT expires", value: "Jul 2027" },
      { label: "Max speed", value: "126 mph" },
      { label: "0 to 62 mph", value: "9.9 s" },
    ]);
    expect(specRows({ ...full, engineLitres: 1.5 }).find((r) => r.label === "Engine")?.value).toBe("1.5 L");
  });

  it("gives a car with only the required fields just Year, and never an empty value", () => {
    const bare: Car = { id: "1", slug: "a-b-2020-1", make: "A", makeSlug: "a", model: "B", modelSlug: "b", year: 2020, priceEur: 1, photos: [] };
    expect(specRows(bare)).toEqual([{ label: "Year", value: "2020" }]);
    for (const r of specRows({ ...full, nctExpiry: "soon" })) expect(r.value).not.toMatch(/undefined|^$/);
    expect(specRows({ ...full, nctExpiry: "soon" }).some((r) => r.label === "NCT expires")).toBe(false);
  });

  it("never shows a road tax row", () => {
    expect(specRows(full).some((r) => /tax/i.test(r.label))).toBe(false);
  });
});

describe("keyFacts", () => {
  it("is Year, Mileage, Fuel and Transmission when all are present", () => {
    expect(keyFacts(full).map((f) => f.label)).toEqual(["Year", "Mileage", "Fuel", "Transmission"]);
  });

  it("fills a missing slot from Body type, Engine and Colour, at most 4", () => {
    expect(keyFacts({ ...full, mileageKm: undefined, fuel: undefined }).map((f) => f.label)).toEqual(["Year", "Transmission", "Body type", "Engine"]);
    expect(keyFacts({ ...full, mileageKm: undefined, fuel: undefined, gearbox: undefined, bodyType: undefined, engineLitres: undefined }).map((f) => f.label)).toEqual(["Year", "Colour"]);
  });
});
