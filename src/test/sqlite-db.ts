/**
 * Test stand-in for `@/lib/db`: the app's schema on an in-memory SQLite (libSQL, the same engine family as D1) with every
 * migration applied. Use in a test file with
 *   vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
 * Each test file gets its own database.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/db/schema";

const client = createClient({ url: ":memory:" });
const dir = join(process.cwd(), "drizzle");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
    if (stmt.trim()) await client.execute(stmt);
  }
}

const db = drizzle(client, { schema });
export const getDb = () => db;

/** Empties the given tables between tests. */
export async function truncate(...tables: string[]) {
  for (const t of tables) await client.execute(`delete from ${t}`);
}
