import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoCars from "@/lib/stock/demo-cars.json";
import { carTitle } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";
import { processLead, snapshotCar } from "./process";
import type { Deps, LeadRow } from "./process";
import { CONSENT, tomorrow } from "./constants";

const cars = demoCars as Car[];
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt)!;

// Fake deps in the test (deps.ts is server-only). 03-05 extends this file and reuses these helpers.
function fakeDeps(over: Partial<Deps["store"]> = {}) {
  const rows: LeadRow[] = [];
  const mail: { subject: string; text: string; replyTo?: string }[] = [];
  const notified: string[] = [];
  const deps: Deps = {
    store: {
      exists: async (ref) => rows.some((r) => r.clientRef === ref),
      insert: async (row) => (rows.push(row), true),
      markNotified: async (id) => void notified.push(id),
      ...over,
    },
    mailer: { send: async (m) => void mail.push(m) },
    getCar: async (id) => cars.find((c) => c.id === id) ?? null,
    limiter: { allow: async () => true },
    verifyTurnstile: async (token) => token === "ok-token",
    demo: true,
    bucket: { put: async () => {}, get: async () => null, delete: async () => {} },
    photoLinkSecret: () => "test-secret",
  };
  return { deps, rows, mail, notified };
}

// The FormData exactly as LeadForm sends an enquiry.
function enquiryForm(fields: Record<string, string> = {}) {
  const fd = new FormData();
  const all = { type: "enquiry", carId: live.id, clientRef: crypto.randomUUID(), sourcePath: `/used-cars/${live.slug}`, name: "Test Buyer", email: "buyer@example.com", consent: "yes", "cf-turnstile-response": "ok-token", ...fields };
  for (const [k, v] of Object.entries(all)) fd.set(k, v);
  return fd;
}

const ctx = { ip: "203.0.113.1" };
let log: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
const lines = () => [...log.mock.calls, ...error.mock.calls].map((c) => JSON.parse(String(c[0])));

describe("processLead, enquiry tracer", () => {
  it("stores one row with the provider's car, mails the dealer and logs one stored line", async () => {
    const { deps, rows, mail, notified } = fakeDeps();
    expect(await processLead(enquiryForm(), ctx, deps)).toEqual({ status: "ok" });

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toMatchObject({ carId: live.id, carSlug: live.slug, carTitle: carTitle(live), carPriceEur: live.priceEur });
    expect(row.sourcePath).toBe(`/used-cars/${live.slug}`);
    expect(row.consentVersion).toBe(CONSENT.version);
    expect(row.photoKeys).toEqual([]);

    expect(mail).toHaveLength(1);
    expect(mail[0].subject.startsWith(`[DEMO] Enquiry: ${carTitle(live)}`)).toBe(true);
    expect(notified).toEqual([row.id]);

    expect(lines()).toEqual([{ leadId: row.id, type: "enquiry", outcome: "stored" }]);
    expect(Object.keys(lines()[0]).sort()).toEqual(["leadId", "outcome", "type"]);
  });

  it("answers ok with no mail when insert loses a double-submit race", async () => {
    const { deps, mail, notified } = fakeDeps({ exists: async () => false, insert: async () => false });
    expect(await processLead(enquiryForm(), ctx, deps)).toEqual({ status: "ok" });
    expect(mail).toHaveLength(0);
    expect(notified).toHaveLength(0);
    expect(lines()).toHaveLength(1);
    expect(lines()[0].outcome).toBe("duplicate");
  });
});

describe("snapshotCar", () => {
  it("gives four nulls without a lookup when the lead has no car (sourcing, trade-in, finance from /finance)", async () => {
    const getCar = vi.fn(async () => live);
    expect(await snapshotCar(undefined, getCar)).toEqual({ carId: null, carSlug: null, carTitle: null, carPriceEur: null });
    expect(getCar).not.toHaveBeenCalled();
  });

  it("refuses an unknown or sold car and snapshots a live one from the provider", async () => {
    const { deps } = fakeDeps();
    expect(await snapshotCar("999999999", deps.getCar)).toBeNull();
    expect(await snapshotCar(sold.id, deps.getCar)).toBeNull();
    expect(await snapshotCar(live.id, deps.getCar)).toEqual({ carId: live.id, carSlug: live.slug, carTitle: carTitle(live), carPriceEur: live.priceEur });
  });
});

describe("processLead rules", () => {
  it("stores the provider's car even when the form carries a forged title and price", async () => {
    const { deps, rows } = fakeDeps();
    await processLead(enquiryForm({ carTitle: "Free car", carPriceEur: "1", price: "1" }), ctx, deps);
    expect(rows[0]).toMatchObject({ carSlug: live.slug, carTitle: carTitle(live), carPriceEur: live.priceEur });
  });

  it.each([
    ["a sold car", () => sold.id],
    ["an unknown car", () => "999999999"],
  ])("refuses %s and stores nothing", async (_, id) => {
    const { deps, rows, mail } = fakeDeps();
    expect(await processLead(enquiryForm({ carId: id() }), ctx, deps)).toEqual({ status: "failed", kind: "server" });
    expect(rows).toHaveLength(0);
    expect(mail).toHaveLength(0);
  });

  it("answers ok to a filled honeypot and stores nothing", async () => {
    const { deps, rows, mail } = fakeDeps();
    expect(await processLead(enquiryForm({ website: "spam.example" }), ctx, deps)).toEqual({ status: "ok" });
    expect(rows).toHaveLength(0);
    expect(mail).toHaveLength(0);
  });

  it("stores a repeated client ref once and answers ok both times", async () => {
    const { deps, rows, mail } = fakeDeps();
    const clientRef = crypto.randomUUID();
    expect(await processLead(enquiryForm({ clientRef }), ctx, deps)).toEqual({ status: "ok" });
    expect(await processLead(enquiryForm({ clientRef }), ctx, deps)).toEqual({ status: "ok" });
    expect(rows).toHaveLength(1);
    expect(mail).toHaveLength(1);
  });

  it("answers ok when the email fails, skips markNotified and logs one notify_failed line with three keys", async () => {
    const { deps, rows, notified } = fakeDeps();
    deps.mailer.send = async () => {
      throw Object.assign(new Error("daily limit"), { code: "E_DAILY_LIMIT_EXCEEDED" });
    };
    expect(await processLead(enquiryForm(), ctx, deps)).toEqual({ status: "ok" });
    expect(rows).toHaveLength(1);
    expect(notified).toHaveLength(0);
    expect(error).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(error.mock.calls[0][0]));
    expect(line).toEqual({ leadId: rows[0].id, type: "enquiry", outcome: "notify_failed" });
    expect(Object.keys(line).sort()).toEqual(["leadId", "outcome", "type"]);
  });
});

describe("processLead bot checks (D-05)", () => {
  it("turns a flood away before reading the fields and never checks Turnstile", async () => {
    const { deps, rows } = fakeDeps();
    const verify = vi.fn(deps.verifyTurnstile);
    deps.verifyTurnstile = verify;
    deps.limiter.allow = async (key) => key !== ctx.ip;
    expect(await processLead(enquiryForm({ name: "" }), ctx, deps)).toEqual({ status: "failed", kind: "rate" });
    expect(verify).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
    expect(lines()).toEqual([{ type: "n/a", outcome: "rate" }]);
  });

  it("validates before Turnstile, so a typo never spends the token", async () => {
    const { deps } = fakeDeps();
    const verify = vi.fn(deps.verifyTurnstile);
    deps.verifyTurnstile = verify;
    expect((await processLead(enquiryForm({ name: "" }), ctx, deps)).status).toBe("invalid");
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuses a missing or bad token and stores nothing", async () => {
    const { deps, rows, mail } = fakeDeps();
    expect(await processLead(enquiryForm({ "cf-turnstile-response": "" }), ctx, deps)).toEqual({ status: "failed", kind: "captcha" });
    expect(await processLead(enquiryForm({ "cf-turnstile-response": "forged" }), ctx, deps)).toEqual({ status: "failed", kind: "captcha" });
    expect(rows).toHaveLength(0);
    expect(mail).toHaveLength(0);
    expect(lines().map((l) => l.outcome)).toEqual(["captcha", "captcha"]);
  });

  it("keeps a test drive's day and time in details, and nothing else", async () => {
    const { deps, rows } = fakeDeps();
    const day = tomorrow();
    expect(await processLead(enquiryForm({ type: "test_drive", preferredDay: day, preferredTime: "afternoon", note: "x" }), ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "test_drive", details: { preferredDay: day, preferredTime: "afternoon" } });
    expect(Object.keys(rows[0].details)).toHaveLength(2);
  });

  // Confirms the 03-05 snapshotCar rule for a car-less type: if this fails, fix snapshotCar, never the test.
  it("stores a sourcing request with no car, never looks one up, and drops a forged carId", async () => {
    const { deps, rows } = fakeDeps();
    const getCar = vi.fn(deps.getCar);
    deps.getCar = getCar;
    const fd = enquiryForm({ type: "sourcing", sourcePath: "/find-a-car", make: "Toyota", model: "", budgetMax: "20000", message: "A small automatic" });
    fd.delete("carId");
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    fd.set("carId", live.id);
    fd.set("clientRef", crypto.randomUUID());
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    for (const row of rows) {
      expect(row).toMatchObject({ type: "sourcing", carId: null, carSlug: null, carTitle: null, carPriceEur: null, message: "A small automatic" });
      expect(row.details).toEqual({ make: "Toyota", budgetMax: 20000 });
    }
    expect(getCar).not.toHaveBeenCalled();
  });

  it("stores a trade-in with no car and its reg and mileage in details, and never looks a car up", async () => {
    const { deps, rows, mail } = fakeDeps();
    const getCar = vi.fn(deps.getCar);
    deps.getCar = getCar;
    const fd = enquiryForm({ type: "trade_in", sourcePath: "/sell-your-car", reg: "191-ky-1234", mileage: "120,500", year: "", carId: live.id });
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "trade_in", carId: null, carSlug: null, carTitle: null, carPriceEur: null });
    expect(rows[0].details).toEqual({ reg: "191-KY-1234", mileage: 120500 });
    expect(getCar).not.toHaveBeenCalled();
    expect(mail[0].subject).toBe("[DEMO] Trade-in valuation"); // no reg in the subject (T-03-29)
  });

  it("answers a filled honeypot without spending the rate limit", async () => {
    const { deps } = fakeDeps();
    const allow = vi.fn(deps.limiter.allow);
    deps.limiter.allow = allow;
    expect(await processLead(enquiryForm({ website: "x" }), ctx, deps)).toEqual({ status: "ok" });
    expect(allow).not.toHaveBeenCalled();
  });
});
