import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIdStore } from "@/lib/id-store";
import { MAX_SAVED } from "./ids";

// Node environment: a hand-rolled localStorage and a window that can dispatch storage events.
type Store = typeof import("./store");
let data: Map<string, string>;
let setItem: (k: string, v: string) => void;
let store: Store;

function storageEvent(key: string | null) {
  const e = new Event("storage") as Event & { key: string | null };
  e.key = key;
  window.dispatchEvent(e);
}

beforeEach(async () => {
  data = new Map();
  setItem = (k, v) => void data.set(k, v);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => setItem(k, v),
  });
  vi.stubGlobal("window", new EventTarget());
  vi.resetModules();
  store = await import("./store");
});

afterEach(() => vi.unstubAllGlobals());

// The same rules the saved list reads with, so a hand-edited localStorage value is cleaned the same way.
const parseIds = (raw: string) => createIdStore("k", MAX_SAVED).parse(raw);

describe("parseIds", () => {
  it("keeps digit-string ids up to 12 digits, newest first, without duplicates", () => {
    expect(parseIds('["3","1","3","1234567890123","12a","",2,null,"123456789012"]')).toEqual(["3", "1", "123456789012"]);
  });

  it("caps at MAX_SAVED", () => {
    const ids = Array.from({ length: store.MAX_SAVED + 20 }, (_, i) => String(i + 1));
    expect(parseIds(JSON.stringify(ids))).toEqual(ids.slice(0, store.MAX_SAVED));
  });

  it.each(["not json", "{", '{"a":"1"}', '"1"', "1", "null", "[1,2,3]"])("reads %s as nothing saved", (raw) => {
    expect(parseIds(raw)).toEqual([]);
  });
});

describe("toggleSaved", () => {
  it("adds a new id at the front, removes an existing one, and tells this tab at once", () => {
    const heard = vi.fn();
    store.subscribe(heard);
    expect(store.toggleSaved("10")).toBe("saved");
    expect(store.toggleSaved("20")).toBe("saved");
    expect(JSON.parse(data.get(store.SAVED_KEY)!)).toEqual(["20", "10"]);
    expect(store.toggleSaved("10")).toBe("removed");
    expect(JSON.parse(data.get(store.SAVED_KEY)!)).toEqual(["20"]);
    expect(heard).toHaveBeenCalledTimes(3);
  });

  it("removeSaved drops only the given ids from the current list, order kept", () => {
    data.set(store.SAVED_KEY, JSON.stringify(["30", "20", "10"]));
    store.removeSaved(["20", "99"]);
    expect(JSON.parse(data.get(store.SAVED_KEY)!)).toEqual(["30", "10"]);
  });

  it("refuses a new car when the list is full and keeps the list as it was", () => {
    const full = Array.from({ length: store.MAX_SAVED }, (_, i) => String(i + 1));
    data.set(store.SAVED_KEY, JSON.stringify(full));
    expect(store.toggleSaved("999")).toBe("full");
    expect(JSON.parse(data.get(store.SAVED_KEY)!)).toEqual(full);
    expect(store.toggleSaved("1")).toBe("removed");
  });

  it("keeps working from memory when setItem throws, and nothing throws", () => {
    setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    const heard = vi.fn();
    store.subscribe(heard);
    expect(store.toggleSaved("10")).toBe("saved");
    expect(store.toggleSaved("20")).toBe("saved");
    expect(store.toggleSaved("10")).toBe("removed");
    expect(heard).toHaveBeenCalledTimes(3);
    expect(data.size).toBe(0);
  });

  it("works when localStorage itself is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    expect(store.toggleSaved("10")).toBe("saved");
    expect(store.toggleSaved("10")).toBe("removed");
  });
});

describe("other tabs", () => {
  it("a storage event for the saved key notifies; another key does not; unsubscribe stops it", () => {
    const heard = vi.fn();
    const stop = store.subscribe(heard);
    storageEvent("something-else");
    expect(heard).not.toHaveBeenCalled();
    storageEvent(store.SAVED_KEY);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    storageEvent(store.SAVED_KEY);
    store.toggleSaved("1");
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("after a blocked write, a change from another tab is read from storage, not the stale copy", () => {
    let blocked = true;
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (blocked) throw new DOMException("quota", "QuotaExceededError");
        data.set(k, v);
      },
    });
    store.subscribe(() => {}); // the page is listening, as it is when a heart or the header badge is mounted
    store.toggleSaved("10"); // the write fails: this tab now holds the list itself
    blocked = false;
    data.set(store.SAVED_KEY, JSON.stringify(["20"])); // another tab saved a different car
    storageEvent(store.SAVED_KEY);
    expect(store.toggleSaved("30")).toBe("saved");
    expect(JSON.parse(data.get(store.SAVED_KEY)!)).toEqual(["30", "20"]);
  });
});
