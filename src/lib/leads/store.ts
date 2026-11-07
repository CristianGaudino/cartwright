import { eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { leads } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { LeadStore } from "./process";

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
