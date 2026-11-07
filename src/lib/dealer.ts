import type { Reviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_FACTS_CONFIRMED, DEALER_TEL, OPENING_HOURS, SITE_NAME, SITE_URL } from "@/lib/site";

// "09:00" -> "9am", "17:30" -> "5:30pm", "12:00" -> "12pm".
const time = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};

export const formatHours = ({ opens, closes }: { opens?: string; closes?: string }) => (opens && closes ? `${time(opens)} to ${time(closes)}` : "Closed");

// Never bracketed placeholder text: unconfirmed, the map searches the town only.
export const mapQuery = (confirmed = DEALER_FACTS_CONFIRMED) =>
  confirmed ? [DEALER_ADDRESS.street, DEALER_ADDRESS.town, DEALER_ADDRESS.county, DEALER_ADDRESS.eircode].join(", ") : "Tralee, Co. Kerry";

export const directionsUrl = (placeId?: string, confirmed = DEALER_FACTS_CONFIRMED) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(confirmed))}${placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ""}`;

export const mapEmbedUrl = (confirmed = DEALER_FACTS_CONFIRMED) => `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(confirmed))}&output=embed`;

// schema.org AutoDealer (D-07). Street, postcode and hours only once confirmed; a rating only from real Google reviews.
// No geo, priceRange, sameAs, review or areaServed: there are no confirmed facts for them.
export function dealerJsonLd(reviews: Reviews | null, confirmed = DEALER_FACTS_CONFIRMED): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": `${SITE_URL}/#dealer`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    image: `${SITE_URL}/brand/logo.png`,
    telephone: DEALER_TEL,
    address: {
      "@type": "PostalAddress",
      ...(confirmed && { streetAddress: DEALER_ADDRESS.street }),
      addressLocality: DEALER_ADDRESS.town,
      addressRegion: DEALER_ADDRESS.county,
      ...(confirmed && { postalCode: DEALER_ADDRESS.eircode }),
      addressCountry: "IE",
    },
  };
  if (confirmed) {
    data.openingHoursSpecification = OPENING_HOURS.filter((h) => h.opens && h.closes).map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  // Valid markup, but Google shows no stars for a business's own reviews; kept for completeness (UI-SPEC).
  if (reviews?.source === "google" && reviews.rating !== undefined && reviews.count !== undefined) {
    data.aggregateRating = { "@type": "AggregateRating", ratingValue: reviews.rating, reviewCount: reviews.count };
  }
  return data;
}
