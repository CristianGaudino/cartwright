import { formatKm, formatPrice } from "./format";
import { FUEL_LABELS, FUELS, GEARBOX_LABELS, GEARBOXES, SORT_KEYS } from "./types";
import type { FacetOption, Facets, Fuel, Gearbox, SortKey, StockQuery } from "./types";

// The only URL <-> StockQuery translation, shared by server and client (BRW-03).
export const PAGE_SIZE = 12;

const emptyQuery = (sort: SortKey = "newest"): StockQuery => ({ make: [], model: [], body: [], fuel: [], sort, page: 1, pageSize: PAGE_SIZE });

export const DEFAULT_QUERY: StockQuery = emptyQuery();

type Params = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_TEXT = 80;
const MAX_SLUG = 40;
const MAX_LIST = 20;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function list(v: string | string[] | undefined): string[] {
  const out = new Set<string>();
  for (const part of (first(v) ?? "").split(",")) {
    const slug = part.trim().toLowerCase();
    if (slug.length <= MAX_SLUG && SLUG.test(slug)) out.add(slug);
  }
  return [...out].slice(0, MAX_LIST);
}

function int(v: string | string[] | undefined, min: number, max: number): number | undefined {
  const s = first(v);
  if (s === undefined || !/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
}

export function parseStockQuery(params: Params): StockQuery {
  const q = emptyQuery();
  const text = first(params.q)?.trim().slice(0, MAX_TEXT);
  if (text) q.q = text;
  q.make = list(params.make);
  q.model = list(params.model);
  q.body = list(params.body);
  q.fuel = list(params.fuel).filter((f): f is Fuel => (FUELS as readonly string[]).includes(f));
  const gearbox = first(params.gearbox);
  if ((GEARBOXES as readonly string[]).includes(gearbox ?? "")) q.gearbox = gearbox as Gearbox;
  q.yearFrom = int(params.yearFrom, 1950, 2100);
  q.yearTo = int(params.yearTo, 1950, 2100);
  q.priceMin = int(params.priceMin, 0, 10_000_000);
  q.priceMax = int(params.priceMax, 0, 10_000_000);
  q.kmMax = int(params.kmMax, 0, 2_000_000);
  if (first(params.sold) === "1") q.sold = "include"; // "only" is for landing pages, never from a URL
  const sort = first(params.sort);
  if ((SORT_KEYS as readonly string[]).includes(sort ?? "")) q.sort = sort as SortKey;
  q.page = int(params.page, 1, 10_000) ?? 1;
  return q;
}

// Order is the UI-SPEC table order, so one query always gives one URL.
export function toSearchParams(q: StockQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.make.length) p.set("make", q.make.join(","));
  if (q.model.length) p.set("model", q.model.join(","));
  if (q.yearFrom !== undefined) p.set("yearFrom", String(q.yearFrom));
  if (q.yearTo !== undefined) p.set("yearTo", String(q.yearTo));
  if (q.priceMin !== undefined) p.set("priceMin", String(q.priceMin));
  if (q.priceMax !== undefined) p.set("priceMax", String(q.priceMax));
  if (q.body.length) p.set("body", q.body.join(","));
  if (q.fuel.length) p.set("fuel", q.fuel.join(","));
  if (q.gearbox) p.set("gearbox", q.gearbox);
  if (q.kmMax !== undefined) p.set("kmMax", String(q.kmMax));
  if (q.sold === "include") p.set("sold", "1");
  if (q.sort !== "newest") p.set("sort", q.sort);
  if (q.page > 1) p.set("page", String(q.page));
  return p;
}

export function stockHref(q: StockQuery): string {
  const s = toSearchParams(q).toString().replaceAll("%2C", ",");
  return s ? `/used-cars?${s}` : "/used-cars";
}

export const clearFilters = (q: StockQuery): StockQuery => emptyQuery(q.sort);

// Applies a From/To or Min/Max change and resets to page 1. If the changed bound crosses the other one, the other one follows it,
// so the buyer never lands on an empty range by picking in the "wrong" order.
export function withRange(q: StockQuery, patch: Partial<StockQuery>): StockQuery {
  const next = { ...q, ...patch, page: 1 };
  for (const [lo, hi] of [["yearFrom", "yearTo"], ["priceMin", "priceMax"]] as const) {
    const [from, to] = [next[lo], next[hi]];
    if (from === undefined || to === undefined || from <= to) continue;
    if (lo in patch) next[hi] = from;
    else next[lo] = to;
  }
  return next;
}

// Toggles one value of a multi-select group and resets to page 1. Removing a make also drops the models that belong to it.
export function toggle(q: StockQuery, group: "make" | "model" | "body" | "fuel", value: string, facets: Facets | null): StockQuery {
  const current: string[] = q[group];
  const removing = current.includes(value);
  const next: StockQuery = { ...q, [group]: removing ? current.filter((v) => v !== value) : [...current, value], page: 1 };
  if (group === "make" && removing && facets) {
    const owned = new Set(facets.model.filter((o) => o.parent === value).map((o) => o.value));
    const other = new Set(facets.model.filter((o) => o.parent !== value).map((o) => o.value));
    next.model = q.model.filter((m) => !owned.has(m) || other.has(m));
  }
  return next;
}

// One entry per applied filter in UI-SPEC group order; `next` is the query with only that filter removed.
export function appliedFilters(q: StockQuery, facets: Facets | null): { id: string; label: string; next: StockQuery }[] {
  const out: { id: string; label: string; next: StockQuery }[] = [];
  const drop = (patch: Partial<StockQuery>): StockQuery => ({ ...q, ...patch, page: 1 });
  const named = (group: "make" | "model" | "body", v: string) => facets?.[group].find((o) => o.value === v)?.label ?? v;
  if (q.q) out.push({ id: "q", label: `Search: ${q.q}`, next: drop({ q: undefined }) });
  for (const v of q.make) out.push({ id: `make:${v}`, label: named("make", v), next: toggle(q, "make", v, facets) });
  for (const v of q.model) out.push({ id: `model:${v}`, label: named("model", v), next: toggle(q, "model", v, facets) });
  if (q.yearFrom !== undefined) out.push({ id: "yearFrom", label: `From ${q.yearFrom}`, next: drop({ yearFrom: undefined }) });
  if (q.yearTo !== undefined) out.push({ id: "yearTo", label: `To ${q.yearTo}`, next: drop({ yearTo: undefined }) });
  if (q.priceMin !== undefined) out.push({ id: "priceMin", label: `From ${formatPrice(q.priceMin)}`, next: drop({ priceMin: undefined }) });
  if (q.priceMax !== undefined) out.push({ id: "priceMax", label: `Up to ${formatPrice(q.priceMax)}`, next: drop({ priceMax: undefined }) });
  for (const v of q.body) out.push({ id: `body:${v}`, label: named("body", v), next: toggle(q, "body", v, facets) });
  for (const v of q.fuel) out.push({ id: `fuel:${v}`, label: FUEL_LABELS[v], next: toggle(q, "fuel", v, facets) });
  if (q.gearbox) out.push({ id: "gearbox", label: GEARBOX_LABELS[q.gearbox], next: drop({ gearbox: undefined }) });
  if (q.kmMax !== undefined) out.push({ id: "kmMax", label: `Up to ${formatKm(q.kmMax)}`, next: drop({ kmMax: undefined }) });
  if (q.sold === "include") out.push({ id: "sold", label: "Sold Cars Included", next: drop({ sold: undefined }) });
  return out;
}

// The rows a multi-select group renders: the options in order, then any selected value missing from them.
// counted: the count shows, and an unselected zero-count row is disabled. Not counted (the load failed): no counts, nothing disabled.
export function facetRows(options: FacetOption[], selected: string[], counted: boolean): { value: string; label: string; count?: number; disabled: boolean }[] {
  const rows = options.map((o) => ({
    value: o.value,
    label: o.label,
    ...(counted && { count: o.count }),
    disabled: counted && o.count === 0 && !selected.includes(o.value),
  }));
  for (const v of selected) if (!options.some((o) => o.value === v)) rows.push({ value: v, label: v, disabled: false });
  return rows;
}
