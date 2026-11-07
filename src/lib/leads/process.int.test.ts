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

function deps(send: Deps["mailer"]["send"] = async () => {}) {
  const mail = vi.fn(send);
  const d: Deps = { store: createDrizzleStore(getDb()), mailer: { send: mail }, getCar: async (id) => cars.find((c) => c.id === id) ?? null, limiter: { allow: async () => true }, verifyTurnstile: async () => true, demo: true };
  return { deps: d, mail };
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
