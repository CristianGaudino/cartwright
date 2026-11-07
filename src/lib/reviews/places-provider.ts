import type { Review, Reviews, ReviewsProvider } from "./index";

const DAY_MS = 86_400_000;
type Fetch = (url: string, init: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>;
type Options = { placeId: string; apiKey: string; fetch?: Fetch; now?: () => number };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const https = (v: unknown) => {
  const s = str(v);
  if (!s) return undefined;
  try {
    return new URL(s).protocol === "https:" ? s : undefined;
  } catch {
    return undefined;
  }
};

function toReview(r: unknown, i: number, placeUri: string): Review | null {
  if (!isObject(r)) return null;
  const author = isObject(r.authorAttribution) ? r.authorAttribution : {};
  const name = str(author.displayName);
  const relativeTime = str(r.relativePublishTimeDescription);
  const rating = r.rating;
  if (!name || !relativeTime || typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  // The original text, so no review is ever shown translated (Google's policy would then need a notice).
  const body = isObject(r.originalText) ? r.originalText : isObject(r.text) ? r.text : {};
  return {
    id: str(r.name) ?? `review-${i}`,
    author: name,
    authorUri: https(author.uri),
    photoUri: https(author.photoUri),
    rating,
    text: typeof body.text === "string" ? body.text : "",
    relativeTime,
    languageCode: str(body.languageCode),
    reviewUri: https(r.googleMapsUri) ?? placeUri,
  };
}

// Places API (New) Place Details. One call a day per isolate, win or lose: a failure is remembered too, so a Google outage
// or a bad key never costs a request or a 3 second wait per page view. Stale reviews are served over none; with none the
// result is null and the page hides the section, never shows an error (D-03).
export function createPlacesProvider({
  placeId,
  apiKey,
  fetch = (url, init) => globalThis.fetch(url, init),
  now = Date.now,
}: Options): ReviewsProvider {
  // shortcut: open-next.config.ts uses the dummy incremental cache, so fetch revalidate shares nothing across Worker
  // isolates and this memo is per isolate. Add the R2 incremental cache (as vintage) before go-live.
  let last: { at: number; data: Reviews | null } | undefined;
  let pending: Promise<Reviews | null> | undefined; // one call in flight, shared by every request that arrives meanwhile

  async function fetchReviews(): Promise<Reviews | null> {
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 86400 },
      });
      if (!res.ok) return null;
      const body: unknown = await res.json();
      if (!isObject(body)) return null;
      const placeUri = https(body.googleMapsUri);
      if (!placeUri || !Array.isArray(body.reviews)) return null;
      const reviews = body.reviews.map((r, i) => toReview(r, i, placeUri)).filter((r): r is Review => r !== null);
      if (!reviews.length) return null;
      const data: Reviews = { source: "google", placeUri, reviews };
      const rating = num(body.rating);
      const count = num(body.userRatingCount);
      if (rating !== undefined) data.rating = rating;
      if (count !== undefined) data.count = count;
      return data;
    } catch {
      return null;
    }
  }

  async function load(): Promise<Reviews | null> {
    const data = (await fetchReviews()) ?? last?.data ?? null;
    last = { at: now(), data };
    return data;
  }

  return {
    get() {
      if (last && now() - last.at < DAY_MS) return Promise.resolve(last.data);
      pending ??= load().finally(() => (pending = undefined));
      return pending;
    },
  };
}
