// The Worker entry (wrangler.jsonc "main"): OpenNext's worker, plus the daily lead purge. OpenNext's own worker has no scheduled
// handler, so this wraps it. Plain JS on purpose: it imports .open-next/worker.js, which exists only after `opennextjs-cloudflare build`,
// so a typecheck of it would fail on a clean checkout.
import { drizzle } from "drizzle-orm/d1";
import handler from "./.open-next/worker.js";
import { purgeOldLeads, purgePastHolds } from "./src/lib/leads/purge.ts";

// OpenNext's worker exports these classes for features this site does not use; kept so the wrapper stays a drop-in.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

const worker = {
  fetch: handler.fetch,
  // wrangler.jsonc "triggers". A failure throws, so Cloudflare marks the run failed and Workers Logs shows it.
  async scheduled(_controller, env) {
    const job = "purge-leads";
    try {
      const db = drizzle(env.DB);
      // counts only, never a lead (D-08): leads past retention, and test drive holds whose time has passed (#166)
      console.log(JSON.stringify({ job, deleted: await purgeOldLeads(db, env.LEAD_PHOTOS), holds: await purgePastHolds(db) }));
    } catch {
      console.error(JSON.stringify({ job, error: "failed" })); // never the error itself: a database error carries the values
      throw new Error(`${job} failed`);
    }
  },
};
export default worker;
