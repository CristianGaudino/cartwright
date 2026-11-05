import type { Car, FacetOption, StockProvider, StockQuery, StockResult } from "./types";

const byLabel = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label, "en-IE");

export function createFileProvider(input: Car[]): StockProvider {
  const cars = [...input].sort((a, b) => Number(b.id) - Number(a.id));
  const bySlug = new Map(cars.map((c) => [c.slug, c]));
  const byId = new Map(cars.map((c) => [c.id, c]));
  const years = cars.length ? { min: Math.min(...cars.map((c) => c.year)), max: Math.max(...cars.map((c) => c.year)) } : null;

  const matches = (car: Car, q: StockQuery) => !q.make.length || q.make.includes(car.makeSlug);

  // Disjunctive: counts ignore the group's own selection, selected values never drop out.
  const makeFacet = (q: StockQuery) => {
    const options = new Map<string, FacetOption>();
    for (const c of cars) options.set(c.makeSlug, { value: c.makeSlug, label: c.make, count: 0 });
    for (const v of q.make) if (!options.has(v)) options.set(v, { value: v, label: v, count: 0 });
    return [...options.values()].sort(byLabel);
  };

  return {
    async query(q): Promise<StockResult> {
      const found = cars.filter((c) => matches(c, q));
      const make = makeFacet(q);
      for (const c of cars) make.find((o) => o.value === c.makeSlug)!.count++;
      make.sort(byLabel);
      const start = (q.page - 1) * q.pageSize;
      return {
        cars: found.slice(start, start + q.pageSize),
        total: found.length,
        page: q.page,
        pageCount: Math.ceil(found.length / q.pageSize),
        facets: { make, model: [], body: [], fuel: [], gearbox: [], years },
      };
    },
    async getBySlug(slug) {
      return bySlug.get(slug) ?? null;
    },
    async getById(id) {
      return byId.get(id) ?? null;
    },
  };
}
