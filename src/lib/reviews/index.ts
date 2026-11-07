import "server-only";
import { createPlacesProvider } from "./places-provider";

// The one place that names a concrete reviews provider (D-01, as src/lib/stock/index.ts).

export type Review = {
  id: string;
  author: string;
  authorUri?: string;
  photoUri?: string;
  rating: number; // integer 1 to 5
  text: string; // may be empty: Google allows rating-only reviews
  relativeTime: string;
  languageCode?: string;
  reviewUri: string;
};

export type Reviews = {
  source: "demo" | "google";
  rating?: number;
  count?: number;
  placeUri: string;
  reviews: Review[];
};

export type ReviewsProvider = { get(): Promise<Reviews | null> };

const DEMO_PLACE = "https://www.google.com/maps/search/?api=1&query=V92%20NT93%2C%20Ireland";
const demo = (n: number, rating: number, text: string, relativeTime: string): Review => ({
  id: `demo-${n}`,
  author: `Sample customer ${"ABCDE"[n - 1]}.`,
  rating,
  text,
  relativeTime,
  languageCode: "en",
  reviewUri: DEMO_PLACE,
});

// Clearly fictional: shown under a Demo reviews pill until the Places provider is configured.
export const DEMO_REVIEWS: Reviews = {
  source: "demo",
  rating: 4.8,
  count: 5,
  placeUri: DEMO_PLACE,
  reviews: [
    demo(1, 5, "Easy to deal with from the first call. The car was ready when we came to collect it.", "a month ago"),
    demo(2, 5, "No pressure at all. They answered every question and let us take our time.", "2 months ago"),
    demo(3, 5, "Straightforward buying a car here. Would go back.", "3 months ago"),
    demo(4, 4, "Good choice of cars. Took a while to decide, and nobody rushed me.", "5 months ago"),
    demo(5, 5, "Friendly people and a simple process from start to finish.", "6 months ago"),
  ],
};

let places: ReviewsProvider | undefined;

// Env is read per call: Worker secrets reach process.env on the first request (see env.ts). Missing config means demo,
// never an error. Once Places is configured its null stands: never fall back to fixtures on a live site.
export async function getReviews(): Promise<Reviews | null> {
  const placeId = process.env.GOOGLE_PLACE_ID;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!placeId || !apiKey) return DEMO_REVIEWS;
  places ??= createPlacesProvider({ placeId, apiKey }); // one provider so its day memo survives between requests
  return places.get();
}
