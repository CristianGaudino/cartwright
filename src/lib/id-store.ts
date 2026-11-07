import { useMemo, useSyncExternalStore } from "react";
import { ID } from "@/lib/saved/ids";

// A list of car ids kept in this browser (localStorage), for saved cars and the compare list. Client-safe: nothing here touches
// window or localStorage at import time, so server rendering can import it.
export function createIdStore(key: string, max: number) {
  const listeners = new Set<() => void>();
  // Set once a write fails (blocked storage or quota); from then on the page reads this instead.
  let fallback: string | null = null;

  // The stored value can be edited by the user or an extension: keep digit-string ids only, deduped, capped.
  function parse(raw: string): string[] {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === "string" && ID.test(v)))].slice(0, max);
  }

  // The snapshot is the raw string: it compares by value, so React never sees a new object and loops.
  function read(): string {
    if (fallback !== null) return fallback;
    try {
      return localStorage.getItem(key) ?? "[]";
    } catch {
      return "[]";
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

  // The server and the first client render both see nothing, so hydration matches.
  const serverSnapshot = () => "[]";

  function useIds(): string[] {
    const raw = useSyncExternalStore(subscribe, read, serverSnapshot);
    return useMemo(() => parse(raw), [raw]);
  }

  function set(ids: string[]) {
    const raw = JSON.stringify(ids.slice(0, max));
    try {
      localStorage.setItem(key, raw);
      fallback = null;
    } catch {
      fallback = raw;
    }
    // The storage event never fires in the tab that wrote, so tell this tab directly.
    listeners.forEach((l) => l());
  }

  // Reads the current list, not the caller's copy, so a tap made while a page was loading is kept.
  function remove(gone: string[]) {
    set(parse(read()).filter((id) => !gone.includes(id)));
  }

  // "full" changes nothing: a buyer at the cap is told, not silently dropped the oldest car.
  function toggle(id: string): "added" | "removed" | "full" {
    const ids = parse(read());
    if (ids.includes(id)) {
      set(ids.filter((x) => x !== id));
      return "removed";
    }
    if (ids.length >= max) return "full";
    set([id, ...ids]);
    return "added";
  }

  return { parse, subscribe, useIds, set, remove, toggle };
}
