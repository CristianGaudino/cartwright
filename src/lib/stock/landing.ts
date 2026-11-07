import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import { formatPrice } from "./format";
import { carJsonLd } from "./seo";
import type { Car, StockQuery } from "./types";

// Pure: no provider import. The labels and slugs come from the provider's taxonomy.
export type Landing =
  | { kind: "make"; make: string; makeSlug: string }
  | { kind: "body"; body: string; bodySlug: string }
  | { kind: "model"; make: string; makeSlug: string; model: string; modelSlug: string };

export type Facts = ReturnType<typeof landingFacts>;

// Most cars first, then A to Z: the same order as the stock page facets.
function ranked(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en-IE")).map(([n]) => n);
}

// Call with at least one car: an empty landing page has no facts.
export function landingFacts(cars: Car[]) {
  const prices = cars.map((c) => c.priceEur);
  const years = cars.map((c) => c.year);
  return {
    n: cars.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    models: ranked(cars.map((c) => c.model)),
    makes: ranked(cars.map((c) => c.make)),
    oldest: Math.min(...years),
    newest: Math.max(...years),
  };
}

export const landingName = (l: Landing) => (l.kind === "make" ? l.make : l.kind === "body" ? `${l.body} cars` : `${l.make} ${l.model}`);

export const landingPath = (l: Landing) =>
  l.kind === "make" ? `/used-cars/${l.makeSlug}` : l.kind === "body" ? `/used-cars/${l.bodySlug}` : `/used-cars/${l.makeSlug}/${l.modelSlug}`;

// The stock query filter that selects this landing page's cars.
export const landingFilter = (l: Landing): Pick<StockQuery, "make" | "model" | "body"> =>
  l.kind === "make" ? { make: [l.makeSlug], model: [], body: [] } : l.kind === "body" ? { make: [], model: [], body: [l.bodySlug] } : { make: [l.makeSlug], model: [l.modelSlug], body: [] };

const priceText = (f: Facts) => (f.n === 1 || f.min === f.max ? `at ${formatPrice(f.min)}` : `from ${formatPrice(f.min)} to ${formatPrice(f.max)}`);

export function landingIntro(l: Landing, f: Facts): string {
  // One body type car reads "1 used SUV car"; makes and models keep their name.
  const noun = l.kind === "body" ? `${l.body} car${f.n === 1 ? "" : "s"}` : landingName(l);
  const first = `We have ${f.n} used ${noun} in stock in Tralee, ${priceText(f)}.`;
  if (l.kind === "model") return `${first} ${f.oldest === f.newest ? `Year: ${f.oldest}.` : `Years: ${f.oldest} to ${f.newest}.`}`;
  if (f.n === 1) return first;
  return l.kind === "make" ? `${first} Models in stock: ${f.models.join(", ")}.` : `${first} Makes in stock: ${f.makes.join(", ")}.`;
}

// No site suffix in the title: the root layout's template adds it. null facts = the empty state (noindex).
export function landingMetadata(l: Landing, f: Facts | null, canonical: string): Metadata {
  const name = landingName(l);
  const title = `Used ${name} for sale in Tralee`;
  const description = f
    ? [
        `${f.n} used ${l.kind === "body" ? `${l.body} car${f.n === 1 ? "" : "s"}` : name} in stock at ${SITE_NAME}, Tralee, ${priceText(f)}.`,
        l.kind === "make" && f.n > 1 && `Models: ${f.models.join(", ")}.`,
        l.kind === "body" && f.n > 1 && `Makes: ${f.makes.join(", ")}.`,
      ]
        .filter(Boolean)
        .join(" ")
    : `No ${name} in stock at ${SITE_NAME} right now. See what we have in Tralee, Co. Kerry.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description, images: [DEFAULT_OG_IMAGE] },
    ...(f ? {} : { robots: { index: false } }),
  };
}

export function itemListJsonLd(cars: Car[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cars.map((car, i) => ({ "@type": "ListItem", position: i + 1, item: carJsonLd(car) })),
  };
}
