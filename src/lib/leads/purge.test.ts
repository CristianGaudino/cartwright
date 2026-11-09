import { beforeEach, describe, expect, it, vi } from "vitest";
import { leads } from "@/lib/db/schema";
import { getDb, truncate } from "@/test/sqlite-db";
import { CONSENT, LEAD_RETENTION_MONTHS } from "./constants";
import { purgeOldLeads } from "./purge";

const NOW = new Date("2026-11-09T12:00:00Z");
const monthsAgo = (n: number, extraDays = 0) => {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCDate(d.getUTCDate() + extraDays);
  return d;
};
const lead = (id: string, createdAt: Date, photoKeys: string[] = []) => ({
  id, clientRef: id, type: "trade_in" as const, sourcePath: "/trade-in", name: "Test Buyer", email: "buyer@example.com", details: {}, photoKeys,
  consentAt: createdAt, consentVersion: CONSENT.version, createdAt,
});
const ids = async () => (await getDb().select({ id: leads.id }).from(leads)).map((r) => r.id).sort();

beforeEach(() => truncate("leads"));

describe("purgeOldLeads", () => {
  it("deletes leads past the retention period with their photos, and keeps newer ones", async () => {
    await getDb().insert(leads).values([
      lead("old-1", monthsAgo(LEAD_RETENTION_MONTHS, -1), ["trade-in/old-1/1.jpg", "trade-in/old-1/2.jpg"]),
      lead("old-2", monthsAgo(24)),
      lead("new-1", monthsAgo(LEAD_RETENTION_MONTHS, 1), ["trade-in/new-1/1.jpg"]), // a day short of the period: kept
      lead("new-2", monthsAgo(0)),
    ]);
    const bucket = { delete: vi.fn(async () => {}) };
    expect(await purgeOldLeads(getDb(), bucket, NOW)).toBe(2);
    expect(await ids()).toEqual(["new-1", "new-2"]);
    expect(bucket.delete).toHaveBeenCalledOnce();
    expect(bucket.delete).toHaveBeenCalledWith(["trade-in/old-1/1.jpg", "trade-in/old-1/2.jpg"]);
  });

  it("keeps the rows when the photos cannot be deleted, so the next run can try again", async () => {
    await getDb().insert(leads).values([lead("old-1", monthsAgo(13), ["trade-in/old-1/1.jpg"])]);
    const bucket = { delete: vi.fn(async () => Promise.reject(new Error("R2 down"))) };
    await expect(purgeOldLeads(getDb(), bucket, NOW)).rejects.toThrow("R2 down");
    expect(await ids()).toEqual(["old-1"]);
  });

  it("deletes photos in batches of 1000 keys", async () => {
    const keys = Array.from({ length: 2500 }, (_, i) => `trade-in/old-1/${i}.jpg`);
    await getDb().insert(leads).values([lead("old-1", monthsAgo(13), keys)]);
    const bucket = { delete: vi.fn(async () => {}) };
    await purgeOldLeads(getDb(), bucket, NOW);
    expect(bucket.delete.mock.calls.map((c) => (c as unknown as string[][])[0].length)).toEqual([1000, 1000, 500]);
  });

  it("does nothing, and touches no bucket, when there is nothing old", async () => {
    await getDb().insert(leads).values([lead("new-1", monthsAgo(1))]);
    const bucket = { delete: vi.fn(async () => {}) };
    expect(await purgeOldLeads(getDb(), bucket, NOW)).toBe(0);
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
