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
