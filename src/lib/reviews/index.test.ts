import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PLACES = { googleMapsUri: "https://maps.google.com/?cid=1", rating: 4.5, userRatingCount: 9, reviews: [{ rating: 5, relativePublishTimeDescription: "a day ago", authorAttribution: { displayName: "B." } }] };

// The module keeps one provider, so each test imports a fresh copy.
const load = () => import("./index");

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getReviews", () => {
  it.each([
    ["neither", "", ""],
    ["only the place ID", "ChIJ1", ""],
    ["only the key", "", "key"],
  ])("returns the demo fixtures without fetching when %s is set", async (_, placeId, key) => {
    vi.stubEnv("GOOGLE_PLACE_ID", placeId);
    vi.stubEnv("GOOGLE_PLACES_API_KEY", key);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { getReviews, DEMO_REVIEWS } = await load();
    expect(await getReviews()).toBe(DEMO_REVIEWS);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns Places data when both are set", async () => {
    vi.stubEnv("GOOGLE_PLACE_ID", "ChIJ1");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    const fetch = vi.fn(async () => new Response(JSON.stringify(PLACES)));
    vi.stubGlobal("fetch", fetch);
    const { getReviews } = await load();
    expect(await getReviews()).toMatchObject({ source: "google", rating: 4.5, count: 9 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("never falls back to the fixtures when Places is configured and fails", async () => {
    vi.stubEnv("GOOGLE_PLACE_ID", "ChIJ1");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const { getReviews } = await load();
    expect(await getReviews()).toBeNull();
  });
});

describe("DEMO_REVIEWS", () => {
  it("are five clearly fictional reviews whose summary matches them", async () => {
    const { DEMO_REVIEWS: d } = await load();
    expect(d.source).toBe("demo");
    expect(d.reviews.map((r) => r.rating)).toEqual([5, 5, 5, 4, 5]);
    expect(d.count).toBe(d.reviews.length);
    expect(d.rating).toBe(d.reviews.reduce((s, r) => s + r.rating, 0) / d.reviews.length);
    for (const r of d.reviews) {
      expect(r.author).toMatch(/^Sample customer [A-Z]\.$/);
      expect(r).not.toHaveProperty("authorUri");
      expect(r).not.toHaveProperty("photoUri");
      expect(r.reviewUri).toMatch(/^https:\/\//);
    }
    expect(d.placeUri).toMatch(/^https:\/\//);
    expect(JSON.stringify(d)).not.toContain(String.fromCharCode(0x2014));
  });
});
