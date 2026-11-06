import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import demoCars from "./demo-cars.json";
import { stock } from "./index";
import { FUELS, GEARBOXES } from "./types";
import type { Car } from "./types";

const cars = demoCars as Car[];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const nextYear = new Date().getFullYear() + 1;

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name).replaceAll("\\", "/")]));
}

describe("generated demo cars", () => {
  it("has cars with unique digit ids and slugs", () => {
    expect(cars.length).toBeGreaterThanOrEqual(1);
    expect(cars.every((c) => /^\d+$/.test(c.id))).toBe(true);
    expect(new Set(cars.map((c) => c.id)).size).toBe(cars.length);
    expect(new Set(cars.map((c) => c.slug)).size).toBe(cars.length);
  });

  it.each(cars.map((c) => [c.slug, c] as const))("%s is well formed", (_slug, c) => {
    expect(c.slug).toBe(`${c.makeSlug}-${c.modelSlug}-${c.year}-${c.id}`);
    expect(c.make).not.toBe("");
    expect(c.model).not.toBe("");
    for (const s of [c.makeSlug, c.modelSlug, c.bodySlug]) if (s !== undefined) expect(s).toMatch(SLUG);
    expect(c.year).toBeGreaterThanOrEqual(1950);
    expect(c.year).toBeLessThanOrEqual(nextYear);
    expect(Number.isInteger(c.priceEur) && c.priceEur > 0).toBe(true);
    if (c.mileageKm !== undefined) expect(Number.isInteger(c.mileageKm) && c.mileageKm >= 0).toBe(true);
    if (c.fuel !== undefined) expect(FUELS).toContain(c.fuel);
    if (c.gearbox !== undefined) expect(GEARBOXES).toContain(c.gearbox);
    expect(c.photos.length).toBeGreaterThanOrEqual(3);
    expect(c.photos.length).toBeLessThanOrEqual(6);
    for (const p of c.photos) {
      expect(p.src).toMatch(new RegExp(`^/stock/${c.id}/[1-6]-[0-9a-f]{8}\\.webp$`));
      expect([p.width, p.height]).toEqual([900, 675]);
      expect(existsSync(`public${p.src}`)).toBe(true);
    }
    for (const s of strings(c)) expect(s).not.toMatch(/[–—<]|&amp;|&#/);
  });

  it("has no photo file that no car references", () => {
    const referenced = new Set(cars.flatMap((c) => c.photos.map((p) => `public${p.src}`)));
    expect(files("public/stock").filter((f) => !referenced.has(f))).toEqual([]);
  });

  it("is served by the single config point", async () => {
    expect(await stock.getBySlug(cars[0].slug)).toEqual(cars[0]);
  });
});
