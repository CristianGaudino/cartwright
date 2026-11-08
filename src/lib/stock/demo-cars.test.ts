import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import demoCars from "./demo-cars.json";
import { createFileProvider } from "./file-provider";
import { stock } from "./index";
import { DEFAULT_QUERY } from "./query";
import { FUELS, GEARBOXES, SOLD_VISIBLE_DAYS } from "./types";
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
  it("has plain text, with no raw HTML entity such as &eacute; left in any field", () => {
    const entity = /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i;
    expect(strings(cars).filter((t) => entity.test(t))).toEqual([]);
  });

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

  describe("spec fields, description and equipment", () => {
    const posInt = (n: number) => Number.isInteger(n) && n > 0;
    const CONTACT_LINE = /@|www\.|https?:\/\/|\b[A-Z]\d{2} ?[A-Z0-9]{4}\b|\b0\d{1,2}[ -]?\d{3}[ -]?\d{3,4}\b/;

    it.each(cars.map((c) => [c.slug, c] as const))("%s has well typed optional fields", (_slug, c) => {
      if (c.engineLitres !== undefined) expect(c.engineLitres).toBeGreaterThan(0);
      for (const n of [c.doors, c.seats, c.owners, c.maxSpeedMph]) if (n !== undefined) expect(posInt(n)).toBe(true);
      if (c.zeroTo62Secs !== undefined) expect(c.zeroTo62Secs).toBeGreaterThan(0);
      if (c.nctExpiry !== undefined) expect(c.nctExpiry).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      for (const s of [c.colour, c.description]) if (s !== undefined) expect(s.trim()).not.toBe("");
      if (c.features !== undefined) {
        expect(c.features.length).toBeGreaterThan(0);
        expect(c.features.every((f) => f.trim() !== "" && f === f.trim())).toBe(true);
        expect(new Set(c.features.map((f) => f.toLowerCase())).size).toBe(c.features.length);
      }
      for (const line of (c.description ?? "").split("\n")) expect(line).not.toMatch(CONTACT_LINE);
    });

    it("keeps the line breaks of the dealer's description", () => {
      expect(cars.some((c) => c.description?.includes("\n"))).toBe(true);
    });

    it("has no make or body slug that could collide with a car slug or each other (D-06)", () => {
      const slugs = [...new Set(cars.flatMap((c) => [c.makeSlug, c.bodySlug].filter((s): s is string => s !== undefined)))];
      expect(slugs.filter((s) => /-\d+$/.test(s))).toEqual([]);
      const makes = new Set(cars.map((c) => c.makeSlug));
      expect(cars.filter((c) => c.bodySlug && makes.has(c.bodySlug))).toEqual([]);
    });

    it("did not lose a field across the board", () => {
      const have = (k: keyof Car) => cars.filter((c) => c[k] !== undefined).length;
      expect(have("features")).toBeGreaterThanOrEqual(cars.length / 2);
      for (const k of ["engineLitres", "colour", "doors", "owners", "seats"] as const) expect(have(k)).toBeGreaterThan(cars.length / 2);
    });
  });

  it("has no photo file that no car references", () => {
    const referenced = new Set(cars.flatMap((c) => c.photos.map((p) => `public${p.src}`)));
    expect(files("public/stock").filter((f) => !referenced.has(f))).toEqual([]);
  });

  // Made by `npm run stock:og`; an extra or missing file means the script was not re-run after stock:build.
  it("has one 1200 x 630 progressive JPEG under 200 KB per car in public/og, and nothing else", async () => {
    expect(readdirSync("public/og").sort()).toEqual(cars.map((c) => `${c.id}.jpg`).sort());
    for (const c of cars) {
      const file = `public/og/${c.id}.jpg`;
      const m = await sharp(file).metadata();
      expect([m.format, m.width, m.height, m.isProgressive]).toEqual(["jpeg", 1200, 630, true]);
      expect(statSync(file).size).toBeLessThan(200_000);
    }
  });

  it("is served by the single config point", async () => {
    const first = cars.find((c) => !c.soldAt)!;
    expect(await stock.getBySlug(first.slug)).toEqual(first);
  });

  describe("sold cars", () => {
    const DAY = 86_400_000;
    const sold = cars.filter((c) => c.soldAt);
    // Never the real clock: the day after the newest sale date, so the result does not change as the calendar moves.
    const now = new Date(Math.max(...sold.map((c) => Date.parse(c.soldAt!))) + DAY);
    const provider = createFileProvider(cars, { now: () => now });

    it("has a sale date that is absent or an ISO date", () => {
      for (const c of cars) if (c.soldAt !== undefined) expect(c.soldAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("keeps in-period sold cars reachable by slug and answers gone for expired ones", async () => {
      const live = sold.filter((c) => Date.parse(c.soldAt!) + SOLD_VISIBLE_DAYS * DAY > now.getTime());
      const gone = sold.filter((c) => !live.includes(c));
      expect(live.length).toBeGreaterThanOrEqual(3);
      expect(gone.length).toBeGreaterThanOrEqual(2);
      for (const c of live) expect((await provider.getBySlug(c.slug))?.id).toBe(c.id);
      for (const c of gone) {
        expect(await provider.getBySlug(c.slug)).toBeNull();
        expect(await provider.lookup(c.slug)).toEqual({ state: "gone", make: c.make, makeSlug: c.makeSlug });
      }
    });

    it("keeps every sold car out of the default list", async () => {
      const r = await provider.query({ ...DEFAULT_QUERY, pageSize: cars.length });
      expect(r.cars.some((c) => c.soldAt)).toBe(false);
      expect(r.total).toBe(cars.length - sold.length);
    });
  });
});
