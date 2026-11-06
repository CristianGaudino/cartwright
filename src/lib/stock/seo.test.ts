import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "@/components/JsonLd";
import { carDescription, carJsonLd, carMetadata } from "./seo";
import type { Car } from "./types";

const SOLD_AT = "2026-10-20";
const car: Car = {
  id: "101",
  slug: "audi-a4-2019-101",
  make: "Audi",
  makeSlug: "audi",
  model: "A4",
  modelSlug: "a4",
  variant: "2.0 TDI S line",
  year: 2019,
  priceEur: 18950,
  mileageKm: 84000,
  fuel: "diesel",
  gearbox: "manual",
  engineLitres: 2,
  photos: [{ src: "/stock/101/0.webp", width: 900, height: 675 }],
};
const sold: Car = { ...car, soldAt: SOLD_AT };
// What a search engine reads: undefined values are gone.
const ld = (c: Car) => JSON.parse(JSON.stringify(carJsonLd(c)));

describe("carMetadata", () => {
  it("has the title without a site suffix, the canonical path and Open Graph", () => {
    const m = carMetadata(car);
    expect(m.title).toBe("2019 Audi A4 2.0 TDI S line for sale");
    expect(m.alternates?.canonical).toBe("/used-cars/audi-a4-2019-101");
    expect(m.openGraph).toMatchObject({ type: "website", url: "/used-cars/audi-a4-2019-101", title: m.title, description: m.description });
  });

  it("points Open Graph at the car's generated image, sold or not, and asks for the large Twitter card", () => {
    for (const c of [car, sold]) {
      const m = carMetadata(c);
      expect(m.openGraph?.images).toEqual([{ url: "/og/101.jpg", width: 1200, height: 630, alt: "2019 Audi A4" }]);
      expect(m.twitter).toMatchObject({ card: "summary_large_image" });
    }
  });
});

describe("carDescription", () => {
  it("lists year, specs, price and the dealer", () => {
    expect(carDescription(car)).toBe("2019 Audi A4 2.0 TDI S line. 84,000 km, Diesel, Manual. €18,950. Carright, Tralee, Co. Kerry.");
  });

  it("drops missing parts with their separators", () => {
    expect(carDescription({ ...car, variant: undefined, mileageKm: undefined, gearbox: undefined })).toBe("2019 Audi A4. Diesel. €18,950. Carright, Tralee, Co. Kerry.");
    expect(carDescription({ ...car, mileageKm: undefined, fuel: undefined, gearbox: undefined })).toBe("2019 Audi A4 2.0 TDI S line. €18,950. Carright, Tralee, Co. Kerry.");
  });

  it("says Sold. in place of the price, with no date", () => {
    expect(carDescription(sold)).toBe("2019 Audi A4 2.0 TDI S line. 84,000 km, Diesel, Manual. Sold. Carright, Tralee, Co. Kerry.");
  });
});

describe("carJsonLd", () => {
  it("is a Product and a Car with an in-stock offer for a car for sale", () => {
    const j = ld(car);
    expect(j["@type"]).toEqual(["Product", "Car"]);
    expect(j).toMatchObject({
      brand: { name: "Audi" },
      model: "A4",
      vehicleModelDate: "2019",
      itemCondition: "https://schema.org/UsedCondition",
      image: ["https://carright.cgaudino.com/stock/101/0.webp"],
      mileageFromOdometer: { value: 84000, unitCode: "KMT" },
      fuelType: "Diesel",
      vehicleTransmission: "Manual",
      vehicleEngine: { engineDisplacement: { value: 2 } },
      offers: {
        price: 18950,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://carright.cgaudino.com/used-cars/audi-a4-2019-101",
        seller: { "@type": "AutoDealer", name: "Carright", telephone: "+353831333154", address: { addressLocality: "Tralee", addressRegion: "Kerry", addressCountry: "IE" } },
      },
    });
  });

  it("leaves out optional Vehicle fields the car does not have", () => {
    const j = ld({ ...car, mileageKm: undefined, fuel: undefined, gearbox: undefined, engineLitres: undefined });
    for (const k of ["mileageFromOdometer", "fuelType", "vehicleTransmission", "bodyType", "numberOfDoors", "vehicleSeatingCapacity", "numberOfPreviousOwners", "color", "vehicleEngine"]) expect(j).not.toHaveProperty(k);
  });

  it("is SoldOut with no price for a sold car, and never carries the sale date", () => {
    const j = ld(sold);
    expect(j.offers.availability).toBe("https://schema.org/SoldOut");
    expect(j.offers).not.toHaveProperty("price");
    expect(j.offers).not.toHaveProperty("priceCurrency");
    expect(JSON.stringify(carJsonLd(sold))).not.toContain(SOLD_AT);
    expect(JSON.stringify(carMetadata(sold))).not.toContain(SOLD_AT);
  });
});

describe("JsonLd", () => {
  it("writes a ld+json script with every < escaped", () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: { name: "</script><img src=x onerror=alert(1)>" } }));
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    const inner = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect(inner).not.toContain("<");
    expect(JSON.parse(inner).name).toBe("</script><img src=x onerror=alert(1)>");
  });
});
