import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { leads } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { LeadStore } from "./process";

// Not server-only, so the PGlite integration test can run it. Plain insert, select and update only (no batch or
// transaction), so the neon-http and PGlite drivers behave the same. Drizzle parameterises every value (T-03-14).
export function createDrizzleStore(db: PgDatabase<PgQueryResultHKT, typeof schema>): LeadStore {
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
