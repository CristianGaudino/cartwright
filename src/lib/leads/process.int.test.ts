import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import demoCars from "@/lib/stock/demo-cars.json";
import { carTitle } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";
import { truncate } from "@/test/pglite-db";
import { processLead } from "./process";
import type { Deps } from "./process";
import { CONSENT } from "./constants";
import { createDrizzleStore } from "./store";

vi.mock("@/lib/db", () => import("@/test/pglite-db"));

// The pipeline against a real Postgres (PGlite) with the committed migrations, through the real Drizzle store.
const cars = demoCars as Car[];
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt)!;

// An in-memory stand-in for the R2 binding.
function fakeBucket() {
  const objects = new Map<string, { size: number; contentType?: string }>();
  const bucket: Deps["bucket"] = {
    put: async (key, value, opts) => void objects.set(key, { size: (value as Blob).size, contentType: opts?.httpMetadata?.contentType }),
    delete: async (keys) => [keys].flat().forEach((k) => objects.delete(k)),
  };
  return { bucket, objects };
}

function deps(send: Deps["mailer"]["send"] = async () => {}) {
  const mail = vi.fn(send);
  const { bucket, objects } = fakeBucket();
  const d: Deps = {
    store: createDrizzleStore(getDb()),
    mailer: { send: mail },
    getCar: async (id) => cars.find((c) => c.id === id) ?? null,
    limiter: { allow: async () => true },
    verifyTurnstile: async () => true,
    demo: true,
    bucket,
    photoLinkSecret: () => "test-secret",
  };
  return { deps: d, mail, objects };
}

// Small byte arrays with real magic bytes, padded to a size, so no large fixture enters the repo.
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const image = (name: string, size = 300, head = JPEG_HEAD) => {
  const b = new Uint8Array(size);
  b.set(head);
  return new File([b], name, { type: "image/jpeg" });
};

function tradeInForm(photos: File[] = [], fields: Record<string, string> = {}) {
  const fd = enquiryForm({ type: "trade_in", carId: "", sourcePath: "/sell-your-car", reg: "191-KY-1234", mileage: "120500", ...fields });
  fd.delete("carId");
  for (const p of photos) fd.append("photos", p);
  return fd;
}

function enquiryForm(fields: Record<string, string> = {}) {
  const fd = new FormData();
  const all = { type: "enquiry", carId: live.id, clientRef: crypto.randomUUID(), sourcePath: `/used-cars/${live.slug}`, name: "Test Buyer", email: "buyer@example.com", consent: "yes", ...fields };
  for (const [k, v] of Object.entries(all)) fd.set(k, v);
  return fd;
}

const ctx = { ip: "203.0.113.1" };
const OK = { status: "ok" };
const rows = () => getDb().select().from(leads);

beforeEach(async () => {
  await truncate("leads");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("processLead on Postgres", () => {
  it("stores one row with the provider's car, the consent fields and status new, then marks it notified", async () => {
    const { deps: d, mail } = deps();
    const before = Date.now();
    expect(await processLead(enquiryForm({ carTitle: "Free car", carPriceEur: "1" }), ctx, d)).toEqual(OK);

    const stored = await rows();
    expect(stored).toHaveLength(1);
    const row = stored[0];
    expect(row).toMatchObject({
      type: "enquiry",
      status: "new",
      carId: live.id,
      carSlug: live.slug,
      carTitle: carTitle(live),
      carPriceEur: live.priceEur,
      sourcePath: `/used-cars/${live.slug}`,
      consentVersion: CONSENT.version,
      details: {},
      photoKeys: [],
    });
    expect(row.consentAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(row.notifiedAt).toBeInstanceOf(Date);
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("stores a repeated client ref once and answers ok both times", async () => {
    const { deps: d, mail } = deps();
    const clientRef = crypto.randomUUID();
    expect(await processLead(enquiryForm({ clientRef }), ctx, d)).toEqual(OK);
    expect(await processLead(enquiryForm({ clientRef }), ctx, d)).toEqual(OK);
    expect(await rows()).toHaveLength(1);
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("stores one row and sends one email for a double submit at the same moment (T-03-16)", async () => {
    const { deps: d, mail } = deps();
    const clientRef = crypto.randomUUID();
    const results = await Promise.all([processLead(enquiryForm({ clientRef }), ctx, d), processLead(enquiryForm({ clientRef }), ctx, d)]);
    expect(results).toEqual([OK, OK]);
    expect(await rows()).toHaveLength(1);
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("answers ok and leaves notified_at empty when the email fails", async () => {
    const { deps: d } = deps(async () => {
      throw Object.assign(new Error("daily limit"), { code: "E_DAILY_LIMIT_EXCEEDED" });
    });
    expect(await processLead(enquiryForm(), ctx, d)).toEqual(OK);
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0].notifiedAt).toBeNull();
  });

  it("stores nothing for a filled honeypot or a sold car", async () => {
    const { deps: d, mail } = deps();
    expect(await processLead(enquiryForm({ website: "spam.example" }), ctx, d)).toEqual(OK);
    expect(await processLead(enquiryForm({ carId: sold.id }), ctx, d)).toEqual({ status: "failed", kind: "server" });
    expect(await rows()).toHaveLength(0);
    expect(mail).not.toHaveBeenCalled();
  });

  it("keeps the message line breaks", async () => {
    const { deps: d } = deps();
    const message = "First line\nSecond line\r\n\nLast line";
    await processLead(enquiryForm({ message }), ctx, d);
    expect((await rows())[0].message).toBe(message);
  });
});

describe("trade-in photos on Postgres (D-13)", () => {
  const invalid = (error: string) => ({ status: "invalid", fieldErrors: { photos: [error] } });

  it("stores a photo privately under the lead's id and keeps the key, not a URL, in the row", async () => {
    const { deps: d, objects, mail } = deps();
    expect(await processLead(tradeInForm([image("car.jpg")]), ctx, d)).toEqual(OK);
    const [row] = await rows();
    expect(row).toMatchObject({ type: "trade_in", carId: null, carSlug: null, carTitle: null, carPriceEur: null });
    expect(row.photoKeys).toEqual([`trade-in/${row.id}/1.jpg`]);
    expect([...objects.entries()]).toEqual([[`trade-in/${row.id}/1.jpg`, { size: 300, contentType: "image/jpeg" }]]);
    // The dealer gets a signed link for it.
    expect(mail.mock.calls[0][0].text).toMatch(new RegExp(`Photo 1: \\S+/lead-photos/trade-in/${row.id}/1\\.jpg\\?exp=\\d+&sig=[\\w-]{43}`));
  });

  it("stores two photos, with the type from the bytes and not the name", async () => {
    const { deps: d, objects } = deps();
    const png = image("second.jpg", 300, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await processLead(tradeInForm([image("first.jpg"), png]), ctx, d)).toEqual(OK);
    const [row] = await rows();
    expect(row.photoKeys).toEqual([`trade-in/${row.id}/1.jpg`, `trade-in/${row.id}/2.png`]);
    expect(objects.get(`trade-in/${row.id}/2.png`)?.contentType).toBe("image/png");
  });

  it.each([
    ["a GIF named .jpg", () => [image("car.jpg"), image("old.jpg", 300, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], "old.jpg is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB."],
    ["a 13th photo", () => Array.from({ length: 13 }, (_, i) => image(`p${i}.jpg`)), "You can add up to 12 photos."],
    ["a photo over 4 MB", () => [image("big.jpg", 4 * 1024 * 1024 + 1)], "big.jpg is not a photo we can use. Use a JPEG, PNG or WebP under 15 MB."],
    ["a set over 16 MB in total", () => Array.from({ length: 5 }, (_, i) => image(`p${i}.jpg`, 3.5 * 1024 * 1024)), "The photos are too big to send together. Remove one and try again."],
  ])("refuses %s and stores nothing", async (_, photos, error) => {
    const { deps: d, objects, mail } = deps();
    expect(await processLead(tradeInForm(photos()), ctx, d)).toEqual(invalid(error));
    expect(objects.size).toBe(0);
    expect(await rows()).toHaveLength(0);
    expect(mail).not.toHaveBeenCalled();
  });

  it("ignores photos on other lead types", async () => {
    const { deps: d, objects } = deps();
    const fd = enquiryForm();
    fd.append("photos", image("car.jpg"));
    expect(await processLead(fd, ctx, d)).toEqual(OK);
    expect(objects.size).toBe(0);
    expect((await rows())[0].photoKeys).toEqual([]);
  });

  it("stores no row when a photo write throws, and deletes the photos already put", async () => {
    const { deps: d, objects } = deps();
    let n = 0;
    const put = d.bucket.put;
    d.bucket.put = async (...args) => {
      if (++n === 2) throw new Error("R2 down");
      return put(...args);
    };
    expect(await processLead(tradeInForm([image("a.jpg"), image("b.jpg")]), ctx, d)).toEqual({ status: "failed", kind: "server" });
    expect(await rows()).toHaveLength(0);
    expect(objects.size).toBe(0);
  });

  it("deletes every photo it put when the insert throws", async () => {
    const { deps: d, objects, mail } = deps();
    d.store = {
      ...d.store,
      insert: async () => {
        throw new Error("db down");
      },
    };
    expect(await processLead(tradeInForm([image("a.jpg"), image("b.jpg")]), ctx, d)).toEqual({ status: "failed", kind: "server" });
    expect(objects.size).toBe(0);
    expect(mail).not.toHaveBeenCalled();
  });

  it("deletes its own photos and sends no mail when a concurrent request with the same ref was stored first (T-03-16)", async () => {
    const { deps: d, objects, mail } = deps();
    const clientRef = crypto.randomUUID();
    expect(await processLead(tradeInForm([image("first.jpg")], { clientRef }), ctx, d)).toEqual(OK);
    const [first] = await rows();
    expect(mail).toHaveBeenCalledTimes(1);

    // The second request passed exists at the same moment as the first, so only the insert sees the clash.
    const store = createDrizzleStore(getDb());
    d.store = { ...store, exists: async () => false };
    expect(await processLead(tradeInForm([image("a.jpg"), image("b.jpg")], { clientRef }), ctx, d)).toEqual(OK);

    expect(mail).toHaveBeenCalledTimes(1);
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0].photoKeys).toEqual(first.photoKeys);
    expect([...objects.keys()]).toEqual(first.photoKeys);
  });
});
