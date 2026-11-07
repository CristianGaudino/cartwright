import { useSyncExternalStore } from "react";

// Grid or list on /used-cars, kept in the browser like the saved cars. The server and first render are always the grid.
export type View = "grid" | "list";
const KEY = "carright:stock-view";
const listeners = new Set<() => void>();
let fallback: View | null = null; // set once a write fails (blocked storage)

const read = (): View => {
  if (fallback) return fallback;
  try {
    return localStorage.getItem(KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === null) && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

export const useView = () => useSyncExternalStore(subscribe, read, () => "grid" as View);

export function setView(v: View) {
  try {
    localStorage.setItem(KEY, v);
    fallback = null;
  } catch {
    fallback = v;
  }
  listeners.forEach((l) => l());
}
