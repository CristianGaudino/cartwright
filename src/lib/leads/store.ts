import { and, eq, gt, gte, lte, or } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { driveHolds, leads } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { Asker, HoldStore, LeadStore } from "./process";

// Not server-only, so the libSQL integration test can run it. Plain insert, select and update only (no batch or
// transaction), so the D1 and libSQL drivers behave the same. Drizzle parameterises every value (T-03-14).
export function createDrizzleStore(db: BaseSQLiteDatabase<"async", unknown, typeof schema>): LeadStore {
  return {
    async exists(clientRef) {
      const found = await db.select({ id: leads.id }).from(leads).where(eq(leads.clientRef, clientRef)).limit(1);
      return found.length > 0;
    },
    async insert(row) {
      const stored = await db.insert(leads).values(row).onConflictDoNothing({ target: leads.clientRef }).returning({ id: leads.id });
      return stored.length > 0;
    },
    async markNotified(id) {
      await db.update(leads).set({ notifiedAt: new Date() }).where(eq(leads.id, id));
    },
  };
}

// Test drive holds (#166). take relies on the unique indexes on (car, time), (phone, car) and (email, car): of two requests at once,
// exactly one row goes in.
export function createDrizzleHolds(db: BaseSQLiteDatabase<"async", unknown, typeof schema>): HoldStore {
  const same = ({ phoneKey, emailKey }: Asker) => (emailKey ? or(eq(driveHolds.phoneKey, phoneKey), eq(driveHolds.emailKey, emailKey)) : eq(driveHolds.phoneKey, phoneKey));
  const pending = async (who: Asker, from: Date) =>
    (await db.select({ carId: driveHolds.carId }).from(driveHolds).where(and(same(who), gt(driveHolds.startsAt, from)))).map((r) => r.carId);
  return {
    pending,
    async take(leadId, carId, startsAt, who) {
      const now = new Date();
      // A hold whose time has passed no longer counts, but until the daily purge it would still block this person and car in the indexes.
      await db.delete(driveHolds).where(and(eq(driveHolds.carId, carId), same(who), lte(driveHolds.startsAt, now)));
      const stored = await db.insert(driveHolds).values({ leadId, carId, startsAt, ...who }).onConflictDoNothing().returning({ id: driveHolds.leadId });
      if (stored.length) return "ok";
      return (await pending(who, now)).includes(carId) ? "again" : "taken";
    },
    async free(leadId) {
      await db.delete(driveHolds).where(eq(driveHolds.leadId, leadId));
    },
    async get(leadId) {
      const [hold] = await db.select({ carId: driveHolds.carId, startsAt: driveHolds.startsAt }).from(driveHolds).where(eq(driveHolds.leadId, leadId)).limit(1);
      return hold ?? null;
    },
    async times(carId, from) {
      const rows = await db.select({ startsAt: driveHolds.startsAt }).from(driveHolds).where(and(eq(driveHolds.carId, carId), gte(driveHolds.startsAt, from)));
      return rows.map((r) => r.startsAt);
    },
  };
}
