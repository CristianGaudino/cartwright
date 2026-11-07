import { useMemo, useSyncExternalStore } from "react";
import { ID, MAX_SAVED } from "./ids";

export { MAX_SAVED };

// Client-safe: nothing here touches window or localStorage at import time, so server rendering can import it.
export const SAVED_KEY = "carright:saved-ids";

const listeners = new Set<() => void>();
// Set once a write fails (blocked storage or quota); from then on the page reads this instead.
let fallback: string | null = null;

// The stored value can be edited by the user or an extension: keep digit-string ids only, deduped, capped.
export function parseIds(raw: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && ID.test(v)))].slice(0, MAX_SAVED);
}

// The snapshot is the raw string: it compares by value, so React never sees a new object and loops.
function read(): string {
  if (fallback !== null) return fallback;
  try {
    return localStorage.getItem(SAVED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Fires only in other tabs; key is null when another tab clears storage.
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The server and the first client render both see nothing saved, so hydration matches.
const serverSnapshot = () => "[]";

export function useSavedIds(): string[] {
  const raw = useSyncExternalStore(subscribe, read, serverSnapshot);
  return useMemo(() => parseIds(raw), [raw]);
}

export function setSavedIds(ids: string[]) {
  const raw = JSON.stringify(ids.slice(0, MAX_SAVED));
  try {
    localStorage.setItem(SAVED_KEY, raw);
    fallback = null;
  } catch {
    fallback = raw;
  }
  // The storage event never fires in the tab that wrote, so tell this tab directly.
  listeners.forEach((l) => l());
}

// Reads the current list, not the caller's copy, so a heart tapped while /saved was loading is kept.
export function removeSaved(gone: string[]) {
  setSavedIds(parseIds(read()).filter((id) => !gone.includes(id)));
}

// "full" changes nothing: a buyer at the cap is told, not silently dropped the oldest car.
export function toggleSaved(id: string): "saved" | "removed" | "full" {
  const ids = parseIds(read());
  if (ids.includes(id)) {
    setSavedIds(ids.filter((x) => x !== id));
    return "removed";
  }
  if (ids.length >= MAX_SAVED) return "full";
  setSavedIds([id, ...ids]);
  return "saved";
}
