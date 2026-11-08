import demoCars from "./demo-cars.json";
import { createFileProvider } from "./file-provider";
import { DEFAULT_QUERY } from "./query";
import type { Car, StockProvider, StockQuery } from "./types";

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

// Every car at once, for the pages that need the whole stock (home, finance, sitemap, landing pages). shortcut: one query covers the
// stock while it is under 1000 cars; with a live provider page through it or ask for counts.
export const queryAll = (extra: Partial<StockQuery> = {}) => stock.query({ ...DEFAULT_QUERY, ...extra, pageSize: 1000 });

// The same, for a page that must still render when stock fails: null, and one log line with the error name only.
export const queryAllOrNull = (extra?: Partial<StockQuery>) =>
  queryAll(extra).catch((e) => (console.error("stock.query failed", e instanceof Error ? e.name : typeof e), null));
