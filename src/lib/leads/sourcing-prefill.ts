import { PRICE_STOPS } from "@/lib/stock/types";
import { SOURCING_BODIES } from "./constants";
import { MAKE_OPTIONS } from "./makes";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// "Can't find it?" from a search with no cars: the link to Find a car carries the search, so the buyer does not type it again.
// Make and type as slugs or names, the model by name, the top price as the budget.
export function sourcingHref(s: { make?: string; model?: string; body?: string; budget?: number }): string {
  const p = new URLSearchParams();
  if (s.make) p.set("make", s.make);
  if (s.model) p.set("model", s.model);
  if (s.body) p.set("body", s.body);
  if (s.budget !== undefined) p.set("budget", String(s.budget));
  return p.size ? `/find-a-car?${p}` : "/find-a-car";
}

// Find a car starts with that search filled in, but only with what its form accepts: a make and a type from their lists (matched by slug,
// so "citroen" finds "Citroën"), a budget on the slider's steps, a one-line model of up to 60 characters. Anything else is left blank.
export function sourcingPrefill(p: Params): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const make = one(p.make);
  const knownMake = make && MAKE_OPTIONS.find((o) => o.value && slug(o.value) === slug(make))?.value;
  if (knownMake) out.make = knownMake;
  const model = one(p.model)?.trim();
  if (model && model.length <= 60 && !/[\r\n]/.test(model)) out.model = model;
  const body = one(p.body);
  const knownBody = body && SOURCING_BODIES.find((b) => slug(b) === slug(body));
  if (knownBody) out.bodyType = knownBody;
  const budget = Number(one(p.budget));
  if (PRICE_STOPS.slice(1).includes(budget)) out.budgetMax = String(budget);
  return Object.keys(out).length ? out : undefined;
}
