import { describe, expect, it } from "vitest";
import { createFileProvider } from "./file-provider";
import type { Car, StockProvider, StockQuery } from "./types";

function car(id: string, make: string, model: string, year: number, priceEur: number, extra: Partial<Car> = {}): Car {
  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    slug: `${slugify(make)}-${slugify(model)}-${year}-${id}`,
    make,
    makeSlug: slugify(make),
    model,
    modelSlug: slugify(model),
    year,
    priceEur,
    photos: [{ src: `/stock/${id}/1-aaaaaaaa.webp`, width: 900, height: 675 }],
    ...extra,
  };
}

const body = (bodyType: string) => ({ bodyType, bodySlug: bodyType.toLowerCase() });

const FIXTURE: Car[] = [
  car("101", "Audi", "A4", 2019, 18950, { variant: "2.0 TDI S line", mileageKm: 84000, fuel: "diesel", gearbox: "manual", ...body("Saloon") }),
  car("102", "Audi", "A6", 2021, 32500, { mileageKm: 41000, fuel: "diesel", gearbox: "automatic", ...body("Saloon") }),
  car("103", "Audi", "Q5", 2020, 29900, { mileageKm: 60000, fuel: "hybrid", gearbox: "automatic", ...body("SUV") }),
  car("104", "BMW", "3 Series", 2018, 16500, { mileageKm: 120000, fuel: "diesel", gearbox: "manual", ...body("Saloon") }),
  car("105", "BMW", "X1", 2022, 34950, { variant: "sDrive18i M Sport", mileageKm: 22000, fuel: "petrol", gearbox: "automatic", ...body("SUV") }),
  car("106", "Ford", "Focus", 2017, 9950, { mileageKm: 150000, fuel: "petrol", gearbox: "manual", ...body("Hatchback") }),
  car("107", "Ford", "Kuga", 2021, 24500, { fuel: "plug-in-hybrid", gearbox: "automatic", ...body("SUV") }),
  car("108", "Ford", "Fiesta", 2016, 7500, { mileageKm: 98000, ...body("Hatchback") }),
];

const q = (partial: Partial<StockQuery> = {}): StockQuery => ({
  make: [],
  model: [],
  body: [],
  fuel: [],
  sort: "newest",
  page: 1,
  pageSize: 12,
  ...partial,
});

export function runContract(name: string, makeProvider: (cars: Car[]) => StockProvider): void {
  describe(name, () => {
    const provider = () => makeProvider(structuredClone(FIXTURE));
    const ids = async (partial?: Partial<StockQuery>) => (await provider().query(q(partial))).cars.map((c) => c.id);

    it("returns everything newest first by default", async () => {
      const r = await provider().query(q());
      expect(r.cars.map((c) => c.id)).toEqual(["108", "107", "106", "105", "104", "103", "102", "101"]);
      expect(r.total).toBe(8);
      expect(r.pageCount).toBe(1);
    });

    it("filters by make and counts the make facet", async () => {
      const r = await provider().query(q({ make: ["audi"] }));
      expect(r.cars.map((c) => c.id)).toEqual(["103", "102", "101"]);
      expect(r.facets.make.map((o) => [o.label, o.count])).toEqual([["Audi", 3], ["Ford", 3], ["BMW", 2]]);
    });

    it("looks cars up by slug and by id", async () => {
      const p = provider();
      expect((await p.getBySlug("audi-a4-2019-101"))?.id).toBe("101");
      expect(await p.getBySlug("nope")).toBeNull();
      expect((await p.getById("101"))?.slug).toBe("audi-a4-2019-101");
      expect(await p.getById("999")).toBeNull();
      expect(await p.getById("audi-a4-2019-101")).toBeNull();
    });

    it("returns only the record's own keys", async () => {
      const r = await provider().query(q());
      const original = new Map(FIXTURE.map((c) => [c.id, Object.keys(c).sort()]));
      for (const c of r.cars) expect(Object.keys(c).sort()).toEqual(original.get(c.id));
    });

    it("filters by several makes", async () => {
      expect((await provider().query(q({ make: ["audi", "bmw"] }))).total).toBe(5);
    });

    it("lists models of the selected makes only", async () => {
      const none = await provider().query(q());
      expect(none.facets.model).toEqual([]);
      const audi = await provider().query(q({ make: ["audi"] }));
      const models = [["A4", 1], ["A6", 1], ["Q5", 1]];
      expect(audi.facets.model.map((o) => [o.label, o.count])).toEqual(models);
      expect(audi.facets.model.every((o) => o.parent === "audi")).toBe(true);
      const a4 = await provider().query(q({ make: ["audi"], model: ["a4"] }));
      expect(a4.total).toBe(1);
      expect(a4.facets.model.map((o) => [o.label, o.count])).toEqual(models);
    });

    it("filters by year, price and mileage with inclusive bounds", async () => {
      expect(await ids({ yearFrom: 2020, yearTo: 2021 })).toEqual(["107", "103", "102"]);
      expect(await ids({ priceMin: 10000, priceMax: 25000 })).toEqual(["107", "104", "101"]);
      expect(await ids({ kmMax: 60000 })).toEqual(["105", "103", "102"]);
    });

    it("filters by fuel and counts the fuel facet", async () => {
      const r = await provider().query(q({ fuel: ["diesel"] }));
      expect(r.cars.map((c) => c.id)).toEqual(["104", "102", "101"]);
      expect(r.facets.fuel.map((o) => [o.label, o.count])).toEqual([["Diesel", 3], ["Petrol", 2], ["Hybrid", 1], ["Plug-in hybrid", 1]]);
    });

    it("filters by gearbox and counts the gearbox facet", async () => {
      const r = await provider().query(q({ gearbox: "automatic" }));
      expect(r.cars.map((c) => c.id)).toEqual(["107", "105", "103", "102"]);
      expect(r.facets.gearbox.map((o) => [o.label, o.count])).toEqual([["Automatic", 4], ["Manual", 3]]);
    });

    it("filters by body and labels it from the stock", async () => {
      const r = await provider().query(q({ body: ["suv"] }));
      expect(r.cars.map((c) => c.id)).toEqual(["107", "105", "103"]);
      expect(r.facets.body.map((o) => o.label).sort()).toEqual(["Hatchback", "SUV", "Saloon"]);
    });

    it("searches without caring about accents", async () => {
      const p = makeProvider(structuredClone([...FIXTURE, car("109", "Škoda", "Octavia", 2020, 17500), car("110", "Citroën", "C3", 2019, 11900)]));
      const found = async (text: string) => (await p.query(q({ q: text }))).cars.map((c) => c.id);
      expect(await found("skoda")).toEqual(["109"]);
      expect(await found("ŠKODA octavia")).toEqual(["109"]);
      expect(await found("citroen")).toEqual(["110"]);
    });

    it("searches every token over make, model and variant", async () => {
      expect(await ids({ q: "bmw 3" })).toEqual(["104"]);
      expect(await ids({ q: "s line" })).toEqual(["101"]);
      expect((await provider().query(q({ q: "AUDI" }))).total).toBe(3);
    });

    it("keeps filtered-out values in a facet at zero", async () => {
      const r = await provider().query(q({ make: ["ford"], fuel: ["petrol"] }));
      expect(r.cars.map((c) => c.id)).toEqual(["106"]);
      expect(r.facets.make.map((o) => [o.label, o.count])).toEqual([["BMW", 1], ["Ford", 1], ["Audi", 0]]);
    });

    it("keeps an unknown selected value in its facet", async () => {
      const r = await provider().query(q({ make: ["zzz"] }));
      expect(r.total).toBe(0);
      expect(r.facets.make).toContainEqual({ value: "zzz", label: "zzz", count: 0 });
      expect(r.facets.years).toEqual({ min: 2016, max: 2022 });
    });

    it("sorts by price, year and mileage with a stable tie-break", async () => {
      const asc = ["108", "106", "104", "101", "107", "103", "102", "105"];
      expect(await ids({ sort: "price-asc" })).toEqual(asc);
      expect(await ids({ sort: "price-desc" })).toEqual([...asc].reverse());
      expect(await ids({ sort: "year-desc" })).toEqual(["105", "107", "102", "103", "101", "104", "106", "108"]);
      expect(await ids({ sort: "km-asc" })).toEqual(["105", "102", "103", "101", "108", "104", "106", "107"]);
    });

    it("pages, and returns an empty page past the end", async () => {
      const p2 = await provider().query(q({ pageSize: 3, page: 2 }));
      expect(p2.cars.map((c) => c.id)).toEqual(["105", "104", "103"]);
      expect(p2.pageCount).toBe(3);
      const p4 = await provider().query(q({ pageSize: 3, page: 4 }));
      expect([p4.cars, p4.total, p4.pageCount, p4.page]).toEqual([[], 8, 3, 4]);
    });
  });
}

// Behaves like a remote provider: its own copy of the data, async I/O, answers through the file logic.
function createStubProvider(cars: Car[]): StockProvider {
  const inner = createFileProvider(structuredClone(cars));
  const io = () => new Promise((r) => setTimeout(r, 0));
  return {
    async query(query) {
      await io();
      return inner.query(query);
    },
    async getBySlug(slug) {
      await io();
      return inner.getBySlug(slug);
    },
    async getById(id) {
      await io();
      return inner.getById(id);
    },
  };
}

runContract("file", createFileProvider);
runContract("stub", createStubProvider);
