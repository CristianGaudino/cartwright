import { describe, expect, it } from "vitest";
import { itemListJsonLd, landingFacts, landingFilter, landingIntro, landingMetadata, landingName, landingPath } from "./landing";
import type { Landing } from "./landing";
import { carJsonLd } from "./seo";
import type { Car } from "./types";

const car = (id: string, o: Partial<Car> = {}): Car => ({
  id,
  slug: `audi-a4-2019-${id}`,
  make: "Audi",
  makeSlug: "audi",
  model: "A4",
  modelSlug: "a4",
  year: 2019,
  priceEur: 18950,
  photos: [],
  ...o,
});

const audi: Landing = { kind: "make", make: "Audi", makeSlug: "audi" };
const suv: Landing = { kind: "body", body: "SUV", bodySlug: "suv" };
const a4: Landing = { kind: "model", make: "Audi", makeSlug: "audi", model: "A4", modelSlug: "a4" };

const three = [car("1"), car("2", { model: "A6", modelSlug: "a6", priceEur: 32500, year: 2021 }), car("3", { model: "A4", priceEur: 25000, year: 2020 })];

describe("landingFacts", () => {
  it("counts, spans the price and years, and ranks models and makes by count then name", () => {
    expect(landingFacts([...three, car("4", { make: "BMW", model: "Q5" })])).toEqual({
      n: 4,
      min: 18950,
      max: 32500,
      models: ["A4", "A6", "Q5"],
      makes: ["Audi", "BMW"],
      oldest: 2019,
      newest: 2021,
    });
  });
});

describe("names, paths and filters", () => {
  it("names each kind", () => {
    expect([audi, suv, a4].map(landingName)).toEqual(["Audi", "SUV cars", "Audi A4"]);
    expect([audi, suv, a4].map(landingPath)).toEqual(["/used-cars/audi", "/used-cars/suv", "/used-cars/audi/a4"]);
    expect(landingFilter(a4)).toEqual({ make: ["audi"], model: ["a4"], body: [] });
    expect(landingFilter(suv)).toEqual({ make: [], model: [], body: ["suv"] });
  });
});

describe("landingIntro", () => {
  it("make: live facts and the models in stock", () => {
    const withSix = [...three, car("4", { model: "Q5", priceEur: 30000 })];
    expect(landingIntro(audi, landingFacts(three.slice(1)))).toBe("We have 2 used Audi in stock in Tralee, from €25,000 to €32,500. Models in stock: A4, A6.");
    expect(landingIntro(audi, landingFacts(withSix))).toContain("Models in stock: A4, A6, Q5.");
  });
  it("one car, or equal prices, reads at the price", () => {
    expect(landingIntro(audi, landingFacts([car("1")]))).toBe("We have 1 used Audi in stock in Tralee, at €18,950.");
    expect(landingIntro(audi, landingFacts([car("1"), car("2", { model: "A6" })]))).toBe(
      "We have 2 used Audi in stock in Tralee, at €18,950. Models in stock: A4, A6.",
    );
  });
  it("body: says car or cars and lists makes", () => {
    const two = [car("1", { bodyType: "SUV" }), car("2", { make: "BMW", priceEur: 30000 })];
    expect(landingIntro(suv, landingFacts(two))).toBe("We have 2 used SUV cars in stock in Tralee, from €18,950 to €30,000. Makes in stock: Audi, BMW.");
    expect(landingIntro(suv, landingFacts([car("1")]))).toBe("We have 1 used SUV car in stock in Tralee, at €18,950.");
  });
  it("model: years, or one year", () => {
    expect(landingIntro(a4, landingFacts([car("1"), car("3", { year: 2021, priceEur: 20000 })]))).toBe(
      "We have 2 used Audi A4 in stock in Tralee, from €18,950 to €20,000. Years: 2019 to 2021.",
    );
    expect(landingIntro(a4, landingFacts([car("1")]))).toBe("We have 1 used Audi A4 in stock in Tralee, at €18,950. Year: 2019.");
  });
});

describe("landingMetadata", () => {
  it("titles carry no site suffix", () => {
    const f = landingFacts(three);
    expect([audi, suv, a4].map((l) => landingMetadata(l, f, "/x").title)).toEqual([
      "Used Audi for sale in Tralee",
      "Used SUV cars for sale in Tralee",
      "Used Audi A4 for sale in Tralee",
    ]);
  });
  it("with stock: description from the facts, canonical, indexable", () => {
    const m = landingMetadata(audi, landingFacts(three), "/used-cars/audi");
    expect(m.description).toBe("3 used Audi in stock at Carright, Tralee, from €18,950 to €32,500. Models: A4, A6.");
    expect(m.alternates?.canonical).toBe("/used-cars/audi");
    expect(m.robots).toBeUndefined();
  });
  it("empty: the no-stock description and noindex", () => {
    const m = landingMetadata(audi, null, "/used-cars/audi");
    expect(m.description).toBe("No Audi in stock at Carright right now. See what we have in Tralee, Co. Kerry.");
    expect(m.robots).toEqual({ index: false });
    expect(landingMetadata(suv, null, "/used-cars/suv").description).toBe("No SUV cars in stock at Carright right now. See what we have in Tralee, Co. Kerry.");
  });
  it("uses no em dash", () => {
    expect(JSON.stringify([landingMetadata(audi, landingFacts(three), "/x"), landingMetadata(a4, null, "/x")])).not.toContain("—");
  });
});

describe("itemListJsonLd", () => {
  it("is an ItemList of the cars' Product plus Car records, positioned from 1", () => {
    const ld = itemListJsonLd(three.slice(0, 2));
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, item: carJsonLd(three[0]) },
      { "@type": "ListItem", position: 2, item: carJsonLd(three[1]) },
    ]);
  });
});
