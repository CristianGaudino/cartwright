export const FUELS = ["petrol", "diesel", "hybrid", "plug-in-hybrid", "electric", "other"] as const;
export type Fuel = (typeof FUELS)[number];
export const FUEL_LABELS: Record<Fuel, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  "plug-in-hybrid": "Plug-in hybrid",
  electric: "Electric",
  other: "Other",
};
export const GEARBOXES = ["manual", "automatic"] as const;
export type Gearbox = (typeof GEARBOXES)[number];
export const GEARBOX_LABELS: Record<Gearbox, string> = { manual: "Manual", automatic: "Automatic" };
export const SORT_KEYS = ["newest", "price-asc", "price-desc", "year-desc", "km-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Photo {
  src: string;
  width: number;
  height: number;
}

export interface Car {
  id: string; // stable source listing id, digits only, e.g. "4508173"
  slug: string; // `${makeSlug}-${modelSlug}-${year}-${id}`, unique, a public URL (D-08)
  make: string; // display label, e.g. "Mercedes-Benz"
  makeSlug: string; // e.g. "mercedes-benz"
  model: string;
  modelSlug: string;
  variant?: string;
  year: number;
  priceEur: number; // whole euro
  mileageKm?: number;
  fuel?: Fuel;
  gearbox?: Gearbox;
  bodyType?: string; // display label, e.g. "SUV"
  bodySlug?: string; // e.g. "suv"
  photos: Photo[]; // 0 to 6, local /stock/... paths
  soldAt?: string; // ISO date (YYYY-MM-DD). Drives the sold window and the 410 only. Never render it anywhere.
}

export interface StockQuery {
  q?: string;
  make: string[]; // makeSlug values
  model: string[]; // modelSlug values
  yearFrom?: number;
  yearTo?: number;
  priceMin?: number;
  priceMax?: number;
  body: string[]; // bodySlug values
  fuel: Fuel[];
  gearbox?: Gearbox;
  kmMax?: number;
  sort: SortKey;
  page: number; // 1-based
  pageSize: number;
}

export type FacetGroup = "make" | "model" | "body" | "fuel" | "gearbox";
export interface FacetOption {
  value: string;
  label: string;
  count: number;
  parent?: string; // makeSlug, model options only
}
export interface Facets {
  make: FacetOption[];
  model: FacetOption[];
  body: FacetOption[];
  fuel: FacetOption[];
  gearbox: FacetOption[];
  years: { min: number; max: number } | null; // over the whole stock, not the selection
}
export interface StockResult {
  cars: Car[];
  total: number;
  page: number;
  pageCount: number;
  facets: Facets;
}
// Days a sold car stays visible after its sale date (D-02). One setting: confirm with the dealer.
export const SOLD_VISIBLE_DAYS = 30;
export const isSold = (car: Pick<Car, "soldAt">) => car.soldAt !== undefined;

// live: in stock or sold inside the period. gone: sold past the period (the URL answers 410). null: never known (404).
export type Lookup = { state: "live"; car: Car } | { state: "gone"; make: string; makeSlug: string } | null;

export interface StockProvider {
  query(q: StockQuery): Promise<StockResult>;
  getBySlug(slug: string): Promise<Car | null>; // in stock or sold inside the period
  getById(id: string): Promise<Car | null>; // the stable source listing id (STK-01 "one car by id/slug"); same visibility as getBySlug
  lookup(slug: string): Promise<Lookup>;
}
