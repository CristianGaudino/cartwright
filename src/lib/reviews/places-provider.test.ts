import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlacesProvider } from "./places-provider";

const PLACE = "https://maps.google.com/?cid=123";
const review = (over: Record<string, unknown> = {}) => ({
  name: "places/x/reviews/1",
  rating: 5,
  text: { text: "Translated", languageCode: "en" },
  originalText: { text: "Go maith", languageCode: "ga" },
  relativePublishTimeDescription: "a week ago",
  authorAttribution: { displayName: "Aoife B.", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/a" },
  googleMapsUri: "https://www.google.com/maps/reviews/1",
  ...over,
});
const body = (over: Record<string, unknown> = {}) => ({ rating: 4.7, userRatingCount: 120, googleMapsUri: PLACE, reviews: [review()], ...over });
const ok = (b: unknown) => vi.fn(async () => new Response(JSON.stringify(b), { status: 200 }));
const provider = (fetch: ReturnType<typeof vi.fn>, now = () => 0) => createPlacesProvider({ placeId: "ChIJ abc", apiKey: "secret-key", fetch: fetch as never, now });

afterEach(() => vi.restoreAllMocks());

describe("createPlacesProvider", () => {
  it("maps a 200 to google reviews, using the original text and its language", async () => {
    const data = await provider(ok(body())).get();
    expect(data).toEqual({
      source: "google",
      rating: 4.7,
      count: 120,
      placeUri: PLACE,
      reviews: [
        {
          id: "places/x/reviews/1",
          author: "Aoife B.",
          authorUri: "https://www.google.com/maps/contrib/1",
          photoUri: "https://lh3.googleusercontent.com/a",
          rating: 5,
          text: "Go maith",
          relativeTime: "a week ago",
          languageCode: "ga",
          reviewUri: "https://www.google.com/maps/reviews/1",
        },
      ],
    });
  });

  it("falls back to text when there is no originalText", async () => {
    const data = await provider(ok(body({ reviews: [review({ originalText: undefined })] }))).get();
    expect(data?.reviews[0]).toMatchObject({ text: "Translated", languageCode: "en" });
  });

  it("sends the key only in a header, with the field mask, a signal and a day of revalidate", async () => {
    const fetch = ok(body());
    await provider(fetch).get();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { next: { revalidate: number } }];
    expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ%20abc");
    expect(url).not.toContain("secret-key");
    expect(init.headers).toEqual({ "X-Goog-Api-Key": "secret-key", "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.next.revalidate).toBe(86400);
    expect(init.method).toBeUndefined(); // GET
  });

  it.each([
    ["a non-2xx status", vi.fn(async () => new Response("{}", { status: 403 }))],
    ["a thrown fetch", vi.fn(async () => Promise.reject(new Error("network")))],
    ["a timeout", vi.fn(async () => Promise.reject(new DOMException("timed out", "TimeoutError")))],
    ["invalid JSON", vi.fn(async () => new Response("not json", { status: 200 }))],
    ["a body that is not an object", ok([1, 2])],
    ["no googleMapsUri", ok(body({ googleMapsUri: undefined }))],
    ["a non-https googleMapsUri", ok(body({ googleMapsUri: "http://maps.google.com/?cid=1" }))],
    ["no reviews", ok(body({ reviews: [] }))],
    ["reviews not an array", ok(body({ reviews: "x" }))],
    ["no valid review", ok(body({ reviews: [review({ rating: 0 })] }))],
  ])("returns null for %s", async (_, fetch) => {
    await expect(provider(fetch).get()).resolves.toBeNull();
  });

  it("drops reviews without an author, a relative time or an integer rating from 1 to 5", async () => {
    const reviews = [
      review({ authorAttribution: {} }),
      review({ relativePublishTimeDescription: "" }),
      review({ rating: 4.5 }),
      review({ rating: 6 }),
      review({ rating: "5" }),
      null,
      review({ name: "keep" }),
    ];
    const data = await provider(ok(body({ reviews }))).get();
    expect(data?.reviews.map((r) => r.id)).toEqual(["keep"]);
  });

  it("keeps author, photo and review links only when https, and falls back to the place link", async () => {
    const r = review({ authorAttribution: { displayName: "A", uri: "javascript:alert(1)", photoUri: "http://x/a.png" }, googleMapsUri: "nope" });
    const data = await provider(ok(body({ reviews: [r] }))).get();
    expect(data?.reviews[0].authorUri).toBeUndefined();
    expect(data?.reviews[0].photoUri).toBeUndefined();
    expect(data?.reviews[0].reviewUri).toBe(PLACE);
  });

  it("keeps rating and count only when they are finite numbers", async () => {
    const data = await provider(ok(body({ rating: "4.7", userRatingCount: null }))).get();
    expect(data).not.toHaveProperty("rating");
    expect(data).not.toHaveProperty("count");
    expect(data?.reviews).toHaveLength(1);
  });

  it("reuses a result for 24 hours, then fetches again", async () => {
    let t = 0;
    const fetch = ok(body());
    const p = provider(fetch, () => t);
    await p.get();
    t = 86_400_000 - 1;
    await p.get();
    expect(fetch).toHaveBeenCalledTimes(1);
    t = 86_400_000;
    await p.get();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("calls Google once when it fails and answers null until the day is up", async () => {
    let t = 0;
    const failing = vi.fn(async () => new Response("", { status: 500 }));
    const p = provider(failing, () => t);
    expect(await p.get()).toBeNull();
    expect(await p.get()).toBeNull();
    expect(failing).toHaveBeenCalledTimes(1);
    t = 86_400_000;
    await p.get();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("keeps serving the last good reviews when the next call fails", async () => {
    let t = 0;
    let good = true;
    const fetch = vi.fn(async () => (good ? new Response(JSON.stringify(body()), { status: 200 }) : new Response("", { status: 429 })));
    const p = provider(fetch, () => t);
    const first = await p.get();
    good = false;
    t = 86_400_000;
    expect(await p.get()).toEqual(first);
    expect(await p.get()).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("shares one call between requests that arrive while it is in flight", async () => {
    const fetch = ok(body());
    const p = provider(fetch);
    const [a, b, c] = await Promise.all([p.get(), p.get(), p.get()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("writes nothing to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await provider(ok(body())).get();
    await provider(vi.fn(async () => Promise.reject(new Error("x")))).get();
    await provider(ok(body({ reviews: [] }))).get();
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
