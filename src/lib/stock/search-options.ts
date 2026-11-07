import type { Car } from "./types";

type Option = { slug: string; label: string };

const uniq = <T extends Option>(items: T[]) => [...new Map(items.map((i) => [i.slug, i])).values()].sort((a, b) => a.label.localeCompare(b.label, "en-IE"));

// The home search's drop-downs, from the cars in stock now, so every choice has at least one car behind it.
export function searchOptions(cars: Car[]) {
  return {
    makes: uniq(cars.map((c) => ({ slug: c.makeSlug, label: c.make }))),
    bodies: uniq(cars.flatMap((c) => (c.bodySlug && c.bodyType ? [{ slug: c.bodySlug, label: c.bodyType }] : []))),
    // Model slugs repeat across makes, so the key is make plus model.
    models: [...new Map(cars.map((c) => [`${c.makeSlug}/${c.modelSlug}`, { makeSlug: c.makeSlug, slug: c.modelSlug, label: c.model }])).values()].sort((a, b) =>
      a.label.localeCompare(b.label, "en-IE"),
    ),
  };
}
