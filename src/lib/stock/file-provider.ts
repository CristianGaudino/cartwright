import { FUEL_LABELS, GEARBOX_LABELS, SOLD_VISIBLE_DAYS, isSold } from "./types";
import type { Car, FacetGroup, FacetOption, SortKey, StockProvider, StockQuery, StockResult } from "./types";

// Search ignores case and accents, so "skoda" finds "Škoda" and "citroen" finds "Citroën".
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label, "en-IE");

// `cars` is presorted newest first and Array.prototype.sort is stable, so every key ties by id descending.
const SORTS: Record<SortKey, (a: Car, b: Car) => number> = {
  newest: () => 0,
  "price-asc": (a, b) => a.priceEur - b.priceEur,
  "price-desc": (a, b) => b.priceEur - a.priceEur,
  "year-desc": (a, b) => b.year - a.year,
  "km-asc": (a, b) => (a.mileageKm ?? Number.MAX_SAFE_INTEGER) - (b.mileageKm ?? Number.MAX_SAFE_INTEGER),
};

type Pick = (c: Car) => { value: string; label: string; parent?: string } | undefined;

export function createFileProvider(input: Car[], { now = () => new Date() }: { now?: () => Date } = {}): StockProvider {
  const cars = [...input].sort((a, b) => Number(b.id) - Number(a.id));
  const bySlug = new Map(cars.map((c) => [c.slug, c]));
  const byId = new Map(cars.map((c) => [c.id, c]));
  // Kept off the Car objects so nothing internal leaks to callers.
  const searchText = new Map(cars.map((c) => [c.id, fold(`${c.make} ${c.model} ${c.variant ?? ""}`)]));

  // In stock, or sold inside the period. The clock is read per call, never once here: a Worker lives for days.
  const visibleNow = () => {
    const t = now().getTime();
    return (c: Car) => !c.soldAt || Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > t;
  };

  // Every filter applies unless its group is `skip`, which is how facet counts stay disjunctive.
  const matches = (c: Car, q: StockQuery, skip?: FacetGroup) => {
    if (skip !== "make" && q.make.length && !q.make.includes(c.makeSlug)) return false;
    if (skip !== "model" && q.model.length && !q.model.includes(c.modelSlug)) return false;
    if (skip !== "body" && q.body.length && !(c.bodySlug && q.body.includes(c.bodySlug))) return false;
    if (skip !== "fuel" && q.fuel.length && !(c.fuel && q.fuel.includes(c.fuel))) return false;
    if (skip !== "gearbox" && q.gearbox && c.gearbox !== q.gearbox) return false;
    if (q.yearFrom !== undefined && c.year < q.yearFrom) return false;
    if (q.yearTo !== undefined && c.year > q.yearTo) return false;
    if (q.priceMin !== undefined && c.priceEur < q.priceMin) return false;
    if (q.priceMax !== undefined && c.priceEur > q.priceMax) return false;
    if (q.kmMax !== undefined && (c.mileageKm === undefined || c.mileageKm > q.kmMax)) return false;
    const text = searchText.get(c.id)!;
    return fold(q.q ?? "").split(/\s+/).filter(Boolean).every((t) => text.includes(t));
  };

  // Options: every value in `universe` plus any selected value not in the pool. Count: pool cars passing every filter but this group's.
  const facet = (group: FacetGroup, q: StockQuery, selected: string[], pick: Pick, pool: Car[], universe = pool): FacetOption[] => {
    const options = new Map<string, FacetOption>();
    for (const c of universe) {
      const o = pick(c);
      if (o && !options.has(o.value)) options.set(o.value, { ...o, count: 0 });
    }
    for (const v of selected) if (!options.has(v)) options.set(v, { value: v, label: v, count: 0 });
    for (const c of pool) {
      const o = pick(c);
      if (o && matches(c, q, group)) options.get(o.value)!.count++;
    }
    return [...options.values()].sort(byCount);
  };

  return {
    async query(q): Promise<StockResult> {
      const visible = visibleNow();
      // Sold cars are not in the default pool, so they add no facet option and change no count.
      const pool = cars.filter((c) => visible(c) && (q.sold === "only" ? isSold(c) : q.sold === "include" || !isSold(c)));
      const years = pool.length ? { min: Math.min(...pool.map((c) => c.year)), max: Math.max(...pool.map((c) => c.year)) } : null;
      // Stable partition after the sort: each group keeps the chosen order, sold cars never ahead of buyable ones.
      const sorted = pool.filter((c) => matches(c, q)).sort(SORTS[q.sort]);
      const found = [...sorted.filter((c) => !isSold(c)), ...sorted.filter(isSold)];
      const start = (q.page - 1) * q.pageSize;
      return {
        cars: found.slice(start, start + q.pageSize),
        total: found.length,
        page: q.page,
        pageCount: Math.ceil(found.length / q.pageSize),
        facets: {
          make: facet("make", q, q.make, (c) => ({ value: c.makeSlug, label: c.make }), pool),
          model: q.make.length
            ? facet("model", q, q.model, (c) => ({ value: c.modelSlug, label: c.model, parent: c.makeSlug }), pool, pool.filter((c) => q.make.includes(c.makeSlug)))
            : [],
          body: facet("body", q, q.body, (c) => c.bodySlug && c.bodyType ? { value: c.bodySlug, label: c.bodyType } : undefined, pool),
          fuel: facet("fuel", q, q.fuel, (c) => c.fuel && { value: c.fuel, label: FUEL_LABELS[c.fuel] }, pool),
          gearbox: facet("gearbox", q, q.gearbox ? [q.gearbox] : [], (c) => c.gearbox && { value: c.gearbox, label: GEARBOX_LABELS[c.gearbox] }, pool),
          years,
        },
      };
    },
    async getBySlug(slug) {
      const c = bySlug.get(slug);
      return c && visibleNow()(c) ? c : null;
    },
    async getById(id) {
      const c = byId.get(id);
      return c && visibleNow()(c) ? c : null;
    },
    async lookup(slug) {
      const c = bySlug.get(slug);
      if (!c) return null;
      return visibleNow()(c) ? { state: "live", car: c } : { state: "gone", make: c.make, makeSlug: c.makeSlug };
    },
    async taxonomy() {
      const uniq = <T extends { slug: string; label: string }>(items: T[]) =>
        [...new Map(items.map((i) => [i.slug, i])).values()].sort((a, b) => a.label.localeCompare(b.label, "en-IE"));
      return {
        makes: uniq(cars.map((c) => ({ slug: c.makeSlug, label: c.make }))),
        bodies: uniq(cars.flatMap((c) => (c.bodySlug && c.bodyType ? [{ slug: c.bodySlug, label: c.bodyType }] : []))),
        // Model slugs repeat across makes, so the key is make plus model.
        models: [...new Map(cars.map((c) => [`${c.makeSlug}/${c.modelSlug}`, { makeSlug: c.makeSlug, slug: c.modelSlug, label: c.model }])).values()].sort(
          (a, b) => a.label.localeCompare(b.label, "en-IE"),
        ),
      };
    },
  };
}
