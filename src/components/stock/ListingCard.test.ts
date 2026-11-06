import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { ListingCard } from "./ListingCard";

const SOLD_AT = "2026-10-20";
const car: Car = {
  id: "1",
  slug: "audi-a4-2019-1",
  make: "Audi",
  makeSlug: "audi",
  model: "A4",
  modelSlug: "a4",
  year: 2019,
  priceEur: 18950,
  mileageKm: 60000,
  photos: [{ src: "/stock/1/0.webp", width: 900, height: 675 }],
};
const render = (c: Car) => renderToStaticMarkup(createElement(ListingCard, { car: c, priority: false }));
const priceSlot = (html: string) => html.match(/<p class="text-heading[^>]*>([^<]*)<\/p>/)![1];

describe("ListingCard", () => {
  it("sold: a hidden badge, the word Sold in the price slot, no price, no date", () => {
    const html = render({ ...car, soldAt: SOLD_AT });
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>Sold<\/span>/);
    expect(priceSlot(html)).toBe("Sold");
    expect(html).not.toContain("€");
    expect(html).not.toContain(SOLD_AT);
    expect(html).not.toMatch(/January|February|March|April|May|June|July|August|September|October|November|December|\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
  });

  it("in stock: a euro price and no badge", () => {
    const html = render(car);
    expect(priceSlot(html)).toMatch(/^€[\d,]+$/);
    expect(html).not.toContain("Sold");
  });
});
