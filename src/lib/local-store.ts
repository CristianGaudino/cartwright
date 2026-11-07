import { useSyncExternalStore } from "react";

// One string kept in localStorage as a React external store: the saved cars, the compare list and the grid or list choice all
// use it. Client-safe: nothing touches window or localStorage at import time, so server rendering can import it.
export function createLocalStore(key: string, empty: string) {
  const listeners = new Set<() => void>();
  // Set once a write fails (blocked storage or quota); from then on the page reads this instead.
  let fallback: string | null = null;

  // The snapshot is a string: it compares by value, so React never sees a new object and loops.
  function read(): string {
    if (fallback !== null) return fallback;
    try {
      return localStorage.getItem(key) ?? empty;
    } catch {
      return empty;
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    // Fires only in other tabs; key is null when another tab clears storage.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key && e.key !== null) return;
      fallback = null; // storage works and another tab wrote: read it, not this tab's stale copy
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(raw: string) {
    try {
      localStorage.setItem(key, raw);
      fallback = null;
    } catch {
      fallback = raw;
    }
    // The storage event never fires in the tab that wrote, so tell this tab directly.
    listeners.forEach((l) => l());
  }

  // The server and the first client render both see the empty value, so hydration matches.
  const useRaw = () => useSyncExternalStore(subscribe, read, () => empty);

  return { read, subscribe, write, useRaw };
}
