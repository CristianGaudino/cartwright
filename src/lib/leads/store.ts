import { and, eq, gte } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { driveHolds, leads } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { HoldStore, LeadStore } from "./process";

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

// Test drive holds (#166). take relies on the unique index on (car, time): of two requests at once, exactly one row goes in.
export function createDrizzleHolds(db: BaseSQLiteDatabase<"async", unknown, typeof schema>): HoldStore {
  return {
    async take(leadId, carId, startsAt) {
      const stored = await db.insert(driveHolds).values({ leadId, carId, startsAt }).onConflictDoNothing().returning({ id: driveHolds.leadId });
      return stored.length > 0;
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
