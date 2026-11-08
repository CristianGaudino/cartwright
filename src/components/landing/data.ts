import { cache } from "react";
import { queryAll, stock } from "@/lib/stock";
import { landingFacts, landingFilter } from "@/lib/stock/landing";
import type { Facts, Landing } from "@/lib/stock/landing";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import type { Car, Facets } from "@/lib/stock/types";

export type LandingData = {
  landing: Landing;
  cars: Car[]; // every in-stock car of the make, body type or model, newest first
  facts: Facts | null; // null = nothing in stock (the empty state)
  facets: Facets; // with stock: counts inside this page's cars. Empty: counts over the whole stock, for the way on
  sold: Car[]; // empty state only: up to 3 recently sold
};

// Resolved once per request for generateMetadata and the page. null = not a known make, body type or make and model.
export const resolveLanding = cache(async (slug: string, modelSlug?: string): Promise<LandingData | null> => {
  const tax = await stock.taxonomy();
  const make = tax.makes.find((m) => m.slug === slug);
  const model = modelSlug === undefined ? undefined : tax.models.find((m) => m.makeSlug === slug && m.slug === modelSlug);
  const body = tax.bodies.find((b) => b.slug === slug);
  let landing: Landing;
  if (modelSlug !== undefined) {
    if (!make || !model) return null;
    landing = { kind: "model", make: make.label, makeSlug: make.slug, model: model.label, modelSlug: model.slug };
  } else if (make) landing = { kind: "make", make: make.label, makeSlug: make.slug };
  else if (body) landing = { kind: "body", body: body.label, bodySlug: body.slug };
  else return null;

  const query = landingFilter(landing);
  const { cars, facets } = await queryAll(query);
  if (cars.length) return { landing, cars, facts: landingFacts(cars), facets, sold: [] };
  const [sold, all] = await Promise.all([stock.query({ ...DEFAULT_QUERY, ...query, sold: "only", pageSize: 3 }), stock.query({ ...DEFAULT_QUERY, pageSize: 1 })]);
  return { landing, cars: [], facts: null, facets: all.facets, sold: sold.cars };
});
