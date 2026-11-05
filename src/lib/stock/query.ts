import { FUELS, GEARBOXES, SORT_KEYS } from "./types";
import type { Fuel, Gearbox, SortKey, StockQuery } from "./types";

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
  if (q.sort !== "newest") p.set("sort", q.sort);
  if (q.page > 1) p.set("page", String(q.page));
  return p;
}

export function stockHref(q: StockQuery): string {
  const s = toSearchParams(q).toString().replaceAll("%2C", ",");
  return s ? `/used-cars?${s}` : "/used-cars";
}

export const clearFilters = (q: StockQuery): StockQuery => emptyQuery(q.sort);
