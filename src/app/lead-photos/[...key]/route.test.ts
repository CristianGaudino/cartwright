import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signPhotoPath } from "@/lib/leads/photos";
import { GET } from "./route";

vi.mock("server-only", () => ({}));
const get = vi.fn();
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ LEAD_PHOTOS: { get } }) }));

const KEY = "trade-in/00000000-0000-4000-8000-000000000001/1.jpg";
const call = (path: string) => GET(new NextRequest(`https://example.test${path}`), { params: Promise.resolve({ key: path.split("?")[0].replace("/lead-photos/", "").split("/") }) });

beforeEach(() => {
  vi.stubEnv("PHOTO_LINK_SECRET", "test-secret");
  get.mockResolvedValue({ body: new Blob([new Uint8Array([0xff, 0xd8, 0xff])]).stream(), httpMetadata: { contentType: "image/jpeg" } });
});
afterEach(() => {
  vi.unstubAllEnvs();
  get.mockReset();
});

describe("GET /lead-photos (T-03-32)", () => {
  it("streams a photo for a signed link, uncached, unindexed and unsniffed", async () => {
    const res = await call(await signPhotoPath(KEY, "test-secret"));
    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledWith(KEY);
    expect(Object.fromEntries(res.headers)).toMatchObject({ "content-type": "image/jpeg", "cache-control": "private, no-store", "x-robots-tag": "noindex", "x-content-type-options": "nosniff" });
  });

  it.each([
    ["no signature", async () => `/lead-photos/${KEY}`],
    ["another secret", () => signPhotoPath(KEY, "other-secret")],
    ["an expired link", () => signPhotoPath(KEY, "test-secret", -10)],
    ["a key outside trade-in/", () => signPhotoPath("other/x/1.jpg", "test-secret")],
    ["a key with ..", () => signPhotoPath("trade-in/../x/1.jpg", "test-secret")],
  ])("refuses %s with 403 before reading the bucket", async (_, path) => {
    const res = await call(await path());
    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it("answers 404 for a signed link to a photo that is gone", async () => {
    get.mockResolvedValue(null);
    expect((await call(await signPhotoPath(KEY, "test-secret"))).status).toBe(404);
  });
});
