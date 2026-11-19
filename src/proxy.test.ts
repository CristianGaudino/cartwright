import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lookup = vi.fn();
vi.mock("@/lib/stock", () => ({ stock: { lookup: (slug: string) => lookup(slug) } }));
const { proxy } = await import("./proxy");

beforeEach(() => lookup.mockReset());
const get = (path: string) => proxy(new NextRequest(`https://carright.example${path}`));

describe("the gone car 410 in the proxy", () => {
  it("rewrites a gone car to its make's gone page with a 410", async () => {
    lookup.mockResolvedValueOnce({ state: "gone", make: "Volvo", makeSlug: "volvo" });
    const res = await get("/used-cars/volvo-v40-2017-203");
    expect(res.status).toBe(410);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://carright.example/gone/volvo");
    expect(lookup).toHaveBeenCalledWith("volvo-v40-2017-203");
  });

  it("lets a live car and an unknown car through", async () => {
    lookup.mockResolvedValueOnce({ state: "live", car: {} });
    const live = await get("/used-cars/audi-a4-2019-101");
    expect(live.status).toBe(200);
    expect(live.headers.get("x-middleware-rewrite")).toBeNull();
    lookup.mockResolvedValueOnce(null);
    expect((await get("/used-cars/never-listed-2020-1")).status).toBe(200);
  });

  it("never looks up a path that is not car-shaped or is over 120 characters", async () => {
    for (const path of ["/used-cars/audi", "/used-cars/hatchback", "/used-cars", "/", `/used-cars/${"a-".repeat(60)}1`]) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("x-middleware-rewrite"), path).toBeNull();
    }
    expect(lookup).not.toHaveBeenCalled();
  });
});
