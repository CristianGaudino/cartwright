import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoCars from "@/lib/stock/demo-cars.json";
import { carTitle } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";
import { processLead, snapshotCar } from "./process";
import type { Asker, Deps, LeadRow } from "./process";
import { CONSENT, DRIVE_NOTICE_ERROR, PHOTO_MIN_COUNT } from "./constants";

const cars = demoCars as Car[];
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt)!;

// Fake deps in the test (deps.ts is server-only). 03-05 extends this file and reuses these helpers.
function fakeDeps(over: Partial<Deps["store"]> = {}, holdOver: Partial<Deps["holds"]> = {}) {
  const rows: LeadRow[] = [];
  const held = new Map<string, { carId: string; startsAt: Date; who?: Asker }>();
  const same = (a: Asker, b?: Asker) => a.phoneKey === b?.phoneKey || (a.emailKey !== null && a.emailKey === b?.emailKey);
  const mail: { subject: string; text: string; replyTo?: string }[] = [];
  const notified: string[] = [];
  const deps: Deps = {
    store: {
      exists: async (ref) => rows.some((r) => r.clientRef === ref),
      insert: async (row) => (rows.push(row), true),
      markNotified: async (id) => void notified.push(id),
      ...over,
    },
    holds: {
      take: async (leadId, carId, startsAt, who) => {
        if ([...held.values()].some((h) => h.carId === carId && +h.startsAt === +startsAt)) return "taken";
        held.set(leadId, { carId, startsAt, who });
        return "ok";
      },
      pending: async (who, from) => [...held.values()].filter((h) => same(who, h.who) && h.startsAt > from).map((h) => h.carId),
      free: async (leadId) => void held.delete(leadId),
      get: async (leadId) => held.get(leadId) ?? null,
      times: async () => [],
      ...holdOver,
    },
    mailer: { send: async (m) => void mail.push(m) },
    getCar: async (id) => cars.find((c) => c.id === id) ?? null,
    limiter: { allow: async () => true },
    verifyTurnstile: async (token) => token === "ok-token",
    demo: true,
    bucket: { put: async () => {}, delete: async () => {} },
    photoLinkSecret: () => "test-secret",
  };
  return { deps, rows, mail, notified, held };
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
    expect(await processLead(enquiryForm({ carId: id() }), ctx, deps)).toEqual({ status: "failed", kind: "gone" });
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

  it("tells the buyer it failed when the email fails, skips markNotified and logs one notify_failed line with three keys", async () => {
    const { deps, rows, notified } = fakeDeps();
    deps.mailer.send = async () => {
      throw Object.assign(new Error("daily limit"), { code: "E_DAILY_LIMIT_EXCEEDED" });
    };
    expect(await processLead(enquiryForm(), ctx, deps)).toEqual({ status: "failed", kind: "server" });
    expect(rows).toHaveLength(1);
    expect(notified).toHaveLength(0);
    expect(error).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(error.mock.calls[0][0]));
    expect(line).toEqual({ leadId: rows[0].id, type: "enquiry", outcome: "notify_failed" });
    expect(Object.keys(line).sort()).toEqual(["leadId", "outcome", "type"]);
  });

  it("answers ok when the email went but marking it sent failed", async () => {
    const { deps, rows, mail } = fakeDeps();
    deps.store.markNotified = async () => {
      throw new Error("db down");
    };
    expect(await processLead(enquiryForm(), ctx, deps)).toEqual({ status: "ok" });
    expect(rows).toHaveLength(1);
    expect(mail).toHaveLength(1);
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

  it("takes up to 6 photos with a find-a-car request, under its own folder, and refuses a 7th", async () => {
    const jpg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "car.jpg");
    const form = (n: number) => {
      const fd = enquiryForm({ type: "sourcing", sourcePath: "/find-a-car", make: "Audi", message: "Something like this" });
      fd.delete("carId");
      for (let i = 0; i < n; i++) fd.append("photos", jpg());
      return fd;
    };
    const { deps, rows } = fakeDeps();
    expect(await processLead(form(0), ctx, deps)).toEqual({ status: "ok" }); // none is fine
    expect(rows[0].photoKeys).toEqual([]);
    expect(await processLead(form(6), ctx, deps)).toEqual({ status: "ok" });
    expect(rows[1].photoKeys).toHaveLength(6);
    expect(rows[1].photoKeys.every((k) => k.startsWith(`sourcing/${rows[1].id}/`))).toBe(true);
    const r = await processLead(form(7), ctx, deps);
    expect(r).toMatchObject({ status: "invalid", fieldErrors: { photos: ["You can add up to 6 photos."] } });
    expect(rows).toHaveLength(2);
  });

  it("logs cleanup_failed at error level when the photos of a lost double submit cannot be deleted", async () => {
    const fd = enquiryForm({ type: "sourcing", sourcePath: "/find-a-car", make: "Audi", message: "Something like this" });
    fd.delete("carId");
    fd.append("photos", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "car.jpg"));
    const { deps } = fakeDeps({ insert: async () => false });
    deps.bucket.delete = async () => {
      throw new Error("R2 down");
    };
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    expect(error.mock.calls.map((c: unknown[]) => JSON.parse(String(c[0])).outcome)).toEqual(["cleanup_failed"]);
    expect(log.mock.calls.map((c: unknown[]) => JSON.parse(String(c[0])).outcome)).toEqual(["duplicate"]);
  });

  it("stores a general message with no car and no details, and emails it", async () => {
    const { deps, rows, mail } = fakeDeps();
    const getCar = vi.fn(deps.getCar);
    deps.getCar = getCar;
    const fd = enquiryForm({ type: "general", sourcePath: "/contact", message: "Do you service Fords?" });
    fd.delete("carId");
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "general", carId: null, sourcePath: "/contact", message: "Do you service Fords?", details: {} });
    expect(mail[0].subject).toContain("Message from the website");
    expect(getCar).not.toHaveBeenCalled();
  });

  const tradeIn = (carId: string) => {
    const fd = enquiryForm({ type: "trade_in", sourcePath: "/trade-in", reg: "191-ky-1234", mileage: "120,500", year: "", carId });
    for (let i = 0; i < PHOTO_MIN_COUNT; i++) fd.append("photos", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], `p${i}.jpg`));
    return fd;
  };

  it("stores a trade-in with no car and its reg and mileage in details, and never looks a car up", async () => {
    const { deps, rows, mail } = fakeDeps();
    const getCar = vi.fn(deps.getCar);
    deps.getCar = getCar;
    expect(await processLead(tradeIn(""), ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "trade_in", carId: null, carSlug: null, carTitle: null, carPriceEur: null });
    expect(rows[0].details).toEqual({ reg: "191-KY-1234", mileage: 120500 });
    expect(getCar).not.toHaveBeenCalled();
    expect(mail[0].subject).toBe("[DEMO] Trade-in valuation"); // no reg in the subject (T-03-29)
  });

  it("stores a trade-in from a car page against that car, and keeps one whose car sold meanwhile, with no car", async () => {
    const { deps, rows } = fakeDeps();
    expect(await processLead(tradeIn(live.id), ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "trade_in", carId: live.id, carSlug: live.slug });
    expect(await processLead(tradeIn(sold.id), ctx, deps)).toEqual({ status: "ok" }); // six photos in, the valuation is never lost
    expect(rows[1]).toMatchObject({ type: "trade_in" });
    expect(rows[1].carId ?? null).toBeNull();
  });

  // Confirms the 03-05 snapshotCar rule for finance from /finance: if this fails, fix snapshotCar, never the test.
  it("stores a finance application from /finance with no car and never looks one up", async () => {
    const { deps, rows, mail } = fakeDeps();
    const getCar = vi.fn(deps.getCar);
    deps.getCar = getCar;
    const fd = enquiryForm({ type: "finance", sourcePath: "/finance", deposit: "4000", term: "36", employment: "employed", income: "50000", dateOfBirth: "1990-01-01", iban: "IE00BANK" });
    fd.delete("carId");
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "finance", carId: null, carSlug: null, carTitle: null, carPriceEur: null });
    expect(rows[0].details).toEqual({ deposit: 4000, term: 36, employment: "employed" });
    expect(JSON.stringify(rows[0])).not.toMatch(/50000|1990-01-01|IE00BANK/); // D-17
    expect(mail[0].text).not.toMatch(/50000|1990-01-01|IE00BANK/);
    expect(getCar).not.toHaveBeenCalled();
    expect(mail[0].subject).toBe("[DEMO] Finance application");
  });

  it("stores a finance application from a car page with that car", async () => {
    const { deps, rows } = fakeDeps();
    const fd = enquiryForm({ type: "finance", deposit: "4000", term: "36", employment: "retired" });
    expect(await processLead(fd, ctx, deps)).toEqual({ status: "ok" });
    expect(rows[0]).toMatchObject({ type: "finance", carId: live.id, carSlug: live.slug, carTitle: carTitle(live), carPriceEur: live.priceEur });
  });

  it("answers a filled honeypot without spending the rate limit", async () => {
    const { deps } = fakeDeps();
    const allow = vi.fn(deps.limiter.allow);
    deps.limiter.allow = allow;
    expect(await processLead(enquiryForm({ website: "x" }), ctx, deps)).toEqual({ status: "ok" });
    expect(allow).not.toHaveBeenCalled();
  });
});

describe("processLead, test drive requests (#166)", () => {
  // Friday 20 Nov 2026, 10:00 in Ireland. Only Date is faked, so promises still run.
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-20T10:00:00Z"), toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const drive = (fields: Record<string, string> = {}) => enquiryForm({ type: "test_drive", phone: "087 123 4567", driveDate: "2026-11-24", driveTime: "10:30", ...fields });

  it("holds the car and time, stores the lead and mails the day, time and a signed free-this-slot link", async () => {
    const { deps, rows, mail, held } = fakeDeps();
    expect(await processLead(drive(), ctx, deps)).toEqual({ status: "ok" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "test_drive", carId: live.id, details: { driveDate: "2026-11-24", driveTime: "10:30" } });
    expect([...held]).toEqual([[rows[0].id, { carId: live.id, startsAt: new Date("2026-11-24T10:30:00Z"), who: { phoneKey: "353871234567", emailKey: "buyer@example.com" } }]]);
    expect(mail[0].subject).toBe(`[DEMO] Test drive request, Tue 24 Nov at 10:30: ${carTitle(live)}`);
    expect(mail[0].text).toContain("Day: Tuesday 24 November 2026");
    expect(mail[0].text).toContain("Time: 10:30");
    expect(mail[0].text).toMatch(new RegExp(`/test-drive-slot/${rows[0].id}\\?exp=${Date.parse("2026-11-24T10:30:00Z") / 1000}&sig=[\\w-]{43}`));
  });

  it("refuses the same car and time again with the taken answer, and stores nothing", async () => {
    const { deps, rows, mail } = fakeDeps();
    await processLead(drive(), ctx, deps);
    expect(await processLead(drive({ phone: "+353 86 000 0001", email: "other@example.com" }), ctx, deps)).toEqual({ status: "failed", kind: "taken" });
    expect(rows).toHaveLength(1);
    expect(mail).toHaveLength(1);
    expect(lines().at(-1)).toEqual({ leadId: expect.any(String), type: "test_drive", outcome: "taken" });
    // Another time for the same car is fine from another phone.
    expect(await processLead(drive({ driveTime: "11:30", phone: "+353 86 000 0000", email: "other@example.com" }), ctx, deps)).toEqual({ status: "ok" });
  });

  it("refuses a closed day and a time off the grid before the bot check, and holds nothing", async () => {
    const { deps, held } = fakeDeps();
    const check = vi.spyOn(deps, "verifyTurnstile");
    expect(await processLead(drive({ driveDate: "2026-11-22" }), ctx, deps)).toMatchObject({ status: "invalid", fieldErrors: { driveDate: [expect.any(String)] } });
    expect(await processLead(drive({ driveTime: "10:15" }), ctx, deps)).toMatchObject({ status: "invalid", fieldErrors: { driveTime: [expect.any(String)] } });
    expect(await processLead(drive({ driveTime: "11:00" }), ctx, deps)).toMatchObject({ status: "invalid", fieldErrors: { driveTime: [expect.any(String)] } }); // half past is the grid: never within an hour of a neighbour
    expect(check).not.toHaveBeenCalled();
    expect(held.size).toBe(0);
  });

  it("refuses a sold car as gone, and holds nothing", async () => {
    const { deps, held } = fakeDeps();
    expect(await processLead(drive({ carId: sold.id }), ctx, deps)).toEqual({ status: "failed", kind: "gone" });
    expect(held.size).toBe(0);
  });

  it("frees the hold when the lead is not stored, so no hold is left without its lead", async () => {
    const thrown = fakeDeps({ insert: async () => Promise.reject(new Error("db down")) });
    expect(await processLead(drive(), ctx, thrown.deps)).toEqual({ status: "failed", kind: "server" });
    expect(thrown.held.size).toBe(0);
    const lost = fakeDeps({ exists: async () => false, insert: async () => false });
    expect(await processLead(drive(), ctx, lost.deps)).toEqual({ status: "ok" });
    expect(lost.held.size).toBe(0);
  });

  it("refuses a second request from the same phone for the same car, however the number is written, and keeps nothing of it", async () => {
    // No email here, so only the phone matches.
    const { deps, rows, mail, held } = fakeDeps();
    expect(await processLead(drive({ email: "" }), ctx, deps)).toEqual({ status: "ok" });
    for (const phone of ["+353 87 123 4567", "+353 871234567", "087-123-4567"]) {
      expect(await processLead(drive({ phone, email: "", driveTime: "14:30" }), ctx, deps)).toEqual({ status: "failed", kind: "again" });
    }
    expect([rows.length, mail.length, held.size]).toEqual([1, 1, 1]);
    expect(lines().at(-1)).toEqual({ leadId: expect.any(String), type: "test_drive", outcome: "again" });
    // Another phone for the same car, and the same phone for another car, are fine.
    expect(await processLead(drive({ phone: "+44 7400 123456", driveTime: "14:30" }), ctx, deps)).toEqual({ status: "ok" }); // and its own email
    const other = cars.find((c) => !c.soldAt && c.id !== live.id)!;
    expect(await processLead(drive({ carId: other.id, email: "" }), ctx, deps)).toEqual({ status: "ok" });
  });

  it("refuses a second request for the same car from the same email with another phone; another phone and email both pass", async () => {
    const { deps, rows, held } = fakeDeps();
    expect(await processLead(drive({ email: "ann@example.com" }), ctx, deps)).toEqual({ status: "ok" });
    const again = drive({ phone: "+353 86 000 0000", email: "Ann@Example.COM", driveTime: "14:30" });
    expect(await processLead(again, ctx, deps)).toEqual({ status: "failed", kind: "again" });
    expect(await processLead(drive({ phone: "+353 86 000 0000", driveTime: "14:30" }), ctx, deps)).toEqual({ status: "ok" }); // buyer@example.com
    expect([rows.length, held.size]).toEqual([2, 2]);
  });

  it("allows three pending requests per phone across cars, refuses a fourth, and frees the allowance with a freed slot or a passed time", async () => {
    const { deps, rows, held } = fakeDeps();
    const [a, b, c, d] = cars.filter((x) => !x.soldAt);
    for (const car of [a, b, c]) expect(await processLead(drive({ carId: car.id }), ctx, deps)).toEqual({ status: "ok" });
    expect(await processLead(drive({ carId: d.id }), ctx, deps)).toEqual({ status: "failed", kind: "full" });
    expect(await processLead(drive({ carId: d.id, phone: "+353 86 000 0000" }), ctx, deps)).toEqual({ status: "failed", kind: "full" }); // same email
    expect(await processLead(drive({ carId: d.id, phone: "+353 86 000 0000", email: "other@example.com" }), ctx, deps)).toEqual({ status: "ok" });
    expect([rows.length, held.size]).toEqual([4, 4]);
    expect(lines().at(-2)).toEqual({ leadId: expect.any(String), type: "test_drive", outcome: "full" });
    // A fourth for a car already asked about is told it already has one.
    expect(await processLead(drive({ carId: a.id, driveTime: "14:30" }), ctx, deps)).toEqual({ status: "failed", kind: "again" });

    await deps.holds.free(rows[0].id); // the dealer's "Free this slot"
    expect(await processLead(drive({ carId: d.id, driveTime: "14:30" }), ctx, deps)).toEqual({ status: "ok" });
    expect(await processLead(drive({ carId: a.id, driveTime: "15:30" }), ctx, deps)).toEqual({ status: "failed", kind: "full" });
    // Once the times have passed, they no longer count.
    vi.setSystemTime(new Date("2026-11-24T12:00:00Z"));
    expect(await processLead(drive({ carId: a.id, driveTime: "15:30" }), ctx, deps)).toEqual({ status: "ok" });
  });

  it("refuses a time less than an hour away before the bot check", async () => {
    vi.setSystemTime(new Date("2026-11-24T10:00:00Z")); // Tuesday 10:00
    const { deps, held } = fakeDeps();
    const check = vi.spyOn(deps, "verifyTurnstile");
    expect(await processLead(drive({ driveTime: "10:30" }), ctx, deps)).toMatchObject({ status: "invalid", fieldErrors: { driveTime: [DRIVE_NOTICE_ERROR] } });
    expect(check).not.toHaveBeenCalled();
    expect(held.size).toBe(0);
    expect(await processLead(drive({ driveTime: "11:30" }), ctx, deps)).toEqual({ status: "ok" }); // same day, an hour and a half on
  });

  it("frees the hold when the email fails, so the buyer's retry is not refused as taken", async () => {
    const { deps, held } = fakeDeps();
    deps.mailer.send = async () => Promise.reject(new Error("mail down"));
    expect(await processLead(drive(), ctx, deps)).toEqual({ status: "failed", kind: "server" });
    expect(held.size).toBe(0);
  });
});
