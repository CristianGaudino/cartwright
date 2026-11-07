import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getBindings } from "@/lib/leads/bindings";
import * as schema from "./schema";

// Per call: the D1 binding exists only inside a request (wrangler.jsonc DB). Outside the Worker there is none, so this throws,
// which processLead logs as an error line: a missing binding fails the lead loudly and never silently.
export function getDb() {
  const d1 = getBindings().DB;
  if (!d1) throw new Error("Missing binding DB");
  return drizzle(d1, { schema });
}
