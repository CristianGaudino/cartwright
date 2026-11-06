import demoCars from "./demo-cars.json";
import { createFileProvider } from "./file-provider";
import type { Car, StockProvider } from "./types";

const files = createFileProvider(demoCars as Car[]);

// The one place that names a concrete provider (D-06).
export const stock: StockProvider = {
  ...files,
  // E2E only: set by playwright.config.ts for its local server, never in wrangler.jsonc, a workflow or a deploy.
  // shortcut: this branch is in every build, so if E2E_FAIL_QUERY is ever defined on the Worker (dashboard variable,
  // [vars], .dev.vars) any visitor can force the error state for that one search. Never define it there. CI checks
  // wrangler.jsonc builds only (ci.yml worker job); revisit with a build-time switch if the Worker gets more vars.
  query: (q) => {
    const fail = process.env.E2E_FAIL_QUERY;
    return fail && fail === q.q ? Promise.reject(new Error("forced failure")) : files.query(q);
  },
};
