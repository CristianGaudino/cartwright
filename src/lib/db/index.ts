import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

const make = () => drizzle(neon(requireEnv("DATABASE_URL")), { schema });
let db: ReturnType<typeof make> | undefined;

// Lazy, not at module load: the build needs no DATABASE_URL, and Worker secrets reach process.env on the first request
// (research Pattern 3). HTTP driver: a lead is one statement, so no transaction or WebSocket is needed.
export const getDb = () => (db ??= make());
