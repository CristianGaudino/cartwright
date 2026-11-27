import { createLocalStore } from "@/lib/local-store";
import { SITE_SLUG } from "@/lib/site";

// Grid or list on /used-cars, kept in the browser like the saved cars. The server and the first render are the grid; an inline script in
// StockShell sets a remembered list on the results before the cards draw, so a desktop never sees the grid first.
export type View = "grid" | "list";
export const VIEW_KEY = `${SITE_SLUG}:stock-view`;
const store = createLocalStore(VIEW_KEY, "grid");

export const useView = (): View => (store.useRaw() === "list" ? "list" : "grid");
export const setView = (v: View) => store.write(v);
