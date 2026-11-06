import demoCars from "./demo-cars.json";
import { createFileProvider } from "./file-provider";
import type { Car, StockProvider } from "./types";

const files = createFileProvider(demoCars as Car[]);

// The one place that names a concrete provider (D-06).
export const stock: StockProvider = {
  ...files,
  // E2E only: set by playwright.config.ts for its local server, never in wrangler.jsonc, a workflow or a deploy.
  query: (q) => {
    const fail = process.env.E2E_FAIL_QUERY;
    return fail && fail === q.q ? Promise.reject(new Error("forced failure")) : files.query(q);
  },
};
