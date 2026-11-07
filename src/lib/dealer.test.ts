import { describe, expect, it, vi } from "vitest";
import { DEMO_REVIEWS } from "@/lib/reviews";
import type { Reviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_FACTS_CONFIRMED, OPENING_HOURS, SERVICES } from "@/lib/site";
import { dealerJsonLd, directionsUrl, formatHours, groupHours, mapEmbedUrl, mapQuery } from "./dealer";

vi.mock("server-only", () => ({}));

const google: Reviews = { source: "google", rating: 4.6, count: 87, placeUri: "https://maps.google.com/?cid=1", reviews: [] };
const ld = (reviews: Reviews | null, confirmed: boolean) => JSON.parse(JSON.stringify(dealerJsonLd(reviews, confirmed)));
const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

describe("dealerJsonLd", () => {
  it("always names the dealer, its phone and its town", () => {
    expect(ld(null, false)).toEqual({
      "@context": "https://schema.org",
      "@type": "AutoDealer",
      "@id": "https://carright.cgaudino.com/#dealer",
      name: "Carright",
      url: "https://carright.cgaudino.com",
      logo: "https://carright.cgaudino.com/brand/logo.png",
      image: "https://carright.cgaudino.com/brand/logo.png",
      telephone: "+353831333154",
      address: { "@type": "PostalAddress", addressLocality: "Tralee", addressRegion: "Co. Kerry", addressCountry: "IE" },
    });
  });

  it("unconfirmed: no street, postcode or hours, and no placeholder value anywhere", () => {
    const data = ld(DEMO_REVIEWS, false);
    expect(data.address).not.toHaveProperty("streetAddress");
    expect(data.address).not.toHaveProperty("postalCode");
    expect(data).not.toHaveProperty("openingHoursSpecification");
    expect(strings(data).filter((s) => s.startsWith("["))).toEqual([]);
  });

  it("confirmed: street, postcode and one hours entry per open day", () => {
    const data = ld(null, true);
    expect(data.address).toMatchObject({ streetAddress: DEALER_ADDRESS.street, postalCode: DEALER_ADDRESS.eircode });
    const open = OPENING_HOURS.filter((h) => h.opens);
    expect(data.openingHoursSpecification).toEqual(open.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.day, opens: h.opens, closes: h.closes })));
    expect(data.openingHoursSpecification.map((h: { dayOfWeek: string }) => h.dayOfWeek)).not.toContain("Sunday");
  });

  it("adds aggregateRating only for Google reviews with a rating and a count", () => {
    expect(ld(google, false).aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.6, reviewCount: 87 });
    expect(ld(DEMO_REVIEWS, false)).not.toHaveProperty("aggregateRating");
    expect(ld(null, false)).not.toHaveProperty("aggregateRating");
    expect(ld({ ...google, count: undefined }, false)).not.toHaveProperty("aggregateRating");
    expect(ld({ ...google, rating: undefined }, false)).not.toHaveProperty("aggregateRating");
  });

  it("leaves out properties with no confirmed facts", () => {
    const data = ld(google, true);
    for (const key of ["geo", "priceRange", "sameAs", "review", "areaServed"]) expect(data).not.toHaveProperty(key);
  });
});

describe("hours and map links", () => {
  it("formats hours in plain 12 hour time", () => {
    expect(formatHours({ opens: "09:00", closes: "18:00" })).toBe("9am to 6pm");
    expect(formatHours({ opens: "12:00", closes: "17:30" })).toBe("12pm to 5:30pm");
    expect(formatHours({ opens: "00:00", closes: "09:05" })).toBe("12am to 9:05am");
    expect(formatHours({})).toBe("Closed");
  });

  it("points the map and directions at the eircode", () => {
    expect(mapQuery()).toBe("V92 NT93, Ireland");
    expect(directionsUrl()).toBe("https://www.google.com/maps/search/?api=1&query=V92%20NT93%2C%20Ireland");
    expect(mapEmbedUrl()).toBe("https://maps.google.com/maps?q=V92%20NT93%2C%20Ireland&output=embed");
  });

  it("groups days that share hours", () => {
    expect(groupHours()).toEqual([
      { label: "Monday to Friday", hours: "9:30am to 6pm" },
      { label: "Saturday", hours: "10am to 4pm" },
      { label: "Sunday", hours: "Closed" },
    ]);
    expect(groupHours([{ day: "Monday", opens: "09:00", closes: "17:00" }, { day: "Tuesday", opens: "10:00", closes: "17:00" }, { day: "Wednesday", opens: "10:00", closes: "17:00" }])).toEqual([
      { label: "Monday", hours: "9am to 5pm" },
      { label: "Tuesday to Wednesday", hours: "10am to 5pm" },
    ]);
  });

  it("encodes the place ID", () => {
    expect(directionsUrl("ChIJ x")).toMatch(/&query_place_id=ChIJ%20x$/);
  });
});

it("confirmed facts hold no bracketed placeholder", () => {
  // Flipping DEALER_FACTS_CONFIRMED without the dealer's real facts fails here.
  const bracketed = strings([DEALER_ADDRESS, OPENING_HOURS, SERVICES]).filter((s) => s.includes("["));
  if (DEALER_FACTS_CONFIRMED) expect(bracketed).toEqual([]);
  expect(strings({ a: [{ b: "[x]" }] })).toEqual(["[x]"]); // the scan reaches nested values
});
