import { useMemo } from "react";
import { createLocalStore } from "@/lib/local-store";
import { ID } from "@/lib/saved/ids";

// A list of car ids kept in this browser, for saved cars and the compare list.
export function createIdStore(key: string, max: number) {
  const store = createLocalStore(key, "[]");

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

  const set = (ids: string[]) => store.write(JSON.stringify(ids.slice(0, max)));

  function useIds(): string[] {
    const raw = store.useRaw();
    return useMemo(() => parse(raw), [raw]);
  }

  // Reads the current list, not the caller's copy, so a tap made while a page was loading is kept.
  function remove(gone: string[]) {
    set(parse(store.read()).filter((id) => !gone.includes(id)));
  }

  // "full" changes nothing: a buyer at the cap is told, not silently dropped the oldest car.
  function toggle(id: string): "added" | "removed" | "full" {
    const ids = parse(store.read());
    if (ids.includes(id)) {
      set(ids.filter((x) => x !== id));
      return "removed";
    }
    if (ids.length >= max) return "full";
    set([id, ...ids]);
    return "added";
  }

  return { parse, subscribe: store.subscribe, useIds, set, remove, toggle };
}
