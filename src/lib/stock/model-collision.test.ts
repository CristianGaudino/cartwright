import { describe, expect, it } from "vitest";
import { createFileProvider } from "./file-provider";
import type { Car, StockQuery } from "./types";

// Two makes with a model of the same name (#68). The demo stock has none, a live feed will.
const car = (id: string, make: string): Car => ({
  id,
  slug: `${make}-500-2020-${id}`,
  make: make[0].toUpperCase() + make.slice(1),
  makeSlug: make,
  model: "500",
  modelSlug: "500",
  year: 2020,
  priceEur: 10000,
  photos: [],
});
const q = (partial: Partial<StockQuery>): StockQuery => ({ make: [], model: [], body: [], fuel: [], sort: "newest", page: 1, pageSize: 12, ...partial });
const provider = () => createFileProvider([car("1", "fiat"), car("2", "abarth")]);

describe("a model name shared by two makes", () => {
  it("the make the buyer picked decides: Fiat 500 does not bring in the Abarth 500", async () => {
    const r = await provider().query(q({ make: ["fiat"], model: ["500"] }));
    expect(r.cars.map((c) => c.id)).toEqual(["1"]);
  });

  it("with both makes picked, both come back, and with no make the model alone still matches", async () => {
    expect((await provider().query(q({ make: ["fiat", "abarth"], model: ["500"] }))).total).toBe(2);
    expect((await provider().query(q({ model: ["500"] }))).total).toBe(2);
  });

  it("a make with no such model returns nothing", async () => {
    const r = await provider().query(q({ make: ["fiat"], model: ["panda"] }));
    expect(r.total).toBe(0);
  });
});
