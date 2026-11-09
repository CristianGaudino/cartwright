import { cookies } from "next/headers";
import { DEV_COOKIE, DEV_MODES, type DevMode } from "./dev-modes";
import { createFileProvider } from "./stock/file-provider";
import type { StockProvider } from "./stock/types";

// break-ui: the dev-only Demo / Worst case switch. Everything here is a no-op unless NODE_ENV is "development", so none of it runs in a
// build. The choice lives in a cookie (set by DevDataToggle), read at the data boundary: stock/index.ts and reviews/index.ts.

export async function devMode(): Promise<DevMode> {
  if (process.env.NODE_ENV !== "development") return "demo";
  try {
    const v = (await cookies()).get(DEV_COOKIE)?.value;
    return DEV_MODES.find((m) => m === v) ?? "demo";
  } catch {
    return "demo"; // outside a request (sitemap, static params): the demo data
  }
}

export function withDevData(prod: StockProvider): StockProvider {
  if (process.env.NODE_ENV !== "development") return prod;
  const byMode = new Map<DevMode, StockProvider>();
  const current = async () => {
    const mode = await devMode();
    if (mode === "demo") return prod;
    if (!byMode.has(mode)) {
      const { fixtureCars } = await import("./stock/worst-cars");
      byMode.set(mode, createFileProvider(fixtureCars(mode)));
    }
    return byMode.get(mode)!;
  };
  return {
    query: async (q) => (await current()).query(q),
    getBySlug: async (s) => (await current()).getBySlug(s),
    getById: async (id) => (await current()).getById(id),
    getByIds: async (ids) => (await current()).getByIds(ids),
    lookup: async (s) => (await current()).lookup(s),
    taxonomy: async () => (await current()).taxonomy(),
  };
}
