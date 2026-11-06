import type { MetadataRoute } from "next";
import { SITE_URL, indexable } from "@/lib/site";
import { stock } from "@/lib/stock";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import { isSold } from "@/lib/stock/types";

// Cars leave the sold window without a deploy, so this must not be cached at build (RESEARCH Pitfall 5).
export const dynamic = "force-dynamic";

// No modification dates (no listing date exists) and no photos (they carry X-Robots-Tag: noindex).
// Landing pages are listed once each, only while a car of theirs is in stock (D-08, D-09).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable()) return [];
  // shortcut: one query covers the stock while it is under 1000 cars; page through it with a live provider.
  const { cars } = await stock.query({ ...DEFAULT_QUERY, sold: "include", pageSize: 1000 });
  const landing = new Set(cars.filter((c) => !isSold(c)).flatMap((c) => [c.makeSlug, ...(c.bodySlug ? [c.bodySlug] : []), `${c.makeSlug}/${c.modelSlug}`]));
  return [
    { url: `${SITE_URL}/used-cars` },
    { url: `${SITE_URL}/privacy` },
    ...[...landing].map((path) => ({ url: `${SITE_URL}/used-cars/${path}` })),
    ...cars.map((c) => ({ url: `${SITE_URL}/used-cars/${c.slug}` })),
  ];
}
