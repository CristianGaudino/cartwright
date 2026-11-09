import { createLocalStore } from "@/lib/local-store";
import { SITE_SLUG } from "@/lib/site";

// Grid or list on /used-cars, kept in the browser like the saved cars. The server and first render are always the grid.
export type View = "grid" | "list";
const store = createLocalStore(`${SITE_SLUG}:stock-view`, "grid");

export const useView = (): View => (store.useRaw() === "list" ? "list" : "grid");
export const setView = (v: View) => store.write(v);
