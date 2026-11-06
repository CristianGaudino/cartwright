import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoCars from "@/lib/stock/demo-cars.json";
import { carTitle } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";
import { processLead } from "./process";
import type { Deps, LeadRow } from "./process";
import { CONSENT } from "./schema";

const cars = demoCars as Car[];
const live = cars.find((c) => !c.soldAt)!;

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
    demo: true,
  };
  return { deps, rows, mail, notified };
}

// The FormData exactly as LeadForm sends an enquiry.
function enquiryForm(fields: Record<string, string> = {}) {
  const fd = new FormData();
  const all = { type: "enquiry", carId: live.id, clientRef: crypto.randomUUID(), sourcePath: `/used-cars/${live.slug}`, name: "Test Buyer", email: "buyer@example.com", consent: "yes", ...fields };
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
