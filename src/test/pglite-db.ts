/**
 * Test stand-in for `@/lib/db`: the app's schema on an in-memory Postgres (PGlite) with every migration applied.
 * Use in a test file with
 *   vi.mock("@/lib/db", () => import("@/test/pglite-db"));
 * Each test file gets its own database.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";

const client = new PGlite();
const dir = join(process.cwd(), "drizzle");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
    if (stmt.trim()) await client.exec(stmt);
  }
}

const db = drizzle(client, { schema });
export const getDb = () => db;

/** Empties the given tables between tests. */
export async function truncate(...tables: string[]) {
  await client.exec(`truncate table ${tables.join(", ")} cascade`);
}
