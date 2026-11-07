import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

type Demo = { id: string; soldAt?: string };
// Read from disk: files under src/app may not import the demo data (D-06 lint rule).
const cars: Demo[] = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt)!;

const get = (ids: string) => GET(new Request(`http://localhost/api/saved-cars?ids=${ids}`));

afterEach(() => vi.useRealTimers());

describe("GET /api/saved-cars", () => {
  it("returns live cars in the order asked and lists unknown ids as gone", async () => {
    const res = await get(`999999999999,${live.id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    const body = await res.json();
    expect(body.goneIds).toEqual(["999999999999"]);
    expect(body.cars.map((c: Demo) => c.id)).toEqual([live.id]);
    expect(body.cars[0]).not.toHaveProperty("description");
    expect(body.cars[0]).not.toHaveProperty("features");
  });

  it("returns a car sold inside the period marked sold, with no sale date anywhere", async () => {
    // A day after its sale, so it is inside the window whatever today's date is.
    vi.useFakeTimers({ now: Date.parse(sold.soldAt!) + 86_400_000, toFake: ["Date"] });
    const res = await get(sold.id);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ cars: [{ id: sold.id, soldAt: "sold" }], goneIds: [] });
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("lists a car sold before the period as gone", async () => {
    vi.useFakeTimers({ now: Date.parse(sold.soldAt!) + 365 * 86_400_000, toFake: ["Date"] });
    expect(await (await get(sold.id)).json()).toEqual({ cars: [], goneIds: [sold.id] });
  });

  it("refuses ids that are not digits, empty, or more than 100", async () => {
    for (const ids of ["abc", "", "1,,2", "1234567890123", Array.from({ length: 101 }, (_, i) => i + 1).join(",")]) {
      expect((await get(ids)).status, ids.slice(0, 20)).toBe(400);
    }
    expect((await GET(new Request("http://localhost/api/saved-cars"))).status).toBe(400);
  });
});
