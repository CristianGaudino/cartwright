import { beforeEach, describe, expect, it, vi } from "vitest";
import { createIdStore } from "./id-store";

// Node environment: a hand-rolled localStorage and a window that can dispatch storage events.
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  vi.stubGlobal("window", new EventTarget());
});

describe("createIdStore", () => {
  it("adds newest first, removes, and refuses a fourth car without changing the list", () => {
    const s = createIdStore("k", 3);
    expect(s.toggle("1")).toBe("added");
    expect(s.toggle("2")).toBe("added");
    expect(s.toggle("3")).toBe("added");
    expect(s.toggle("4")).toBe("full");
    expect(JSON.parse(data.get("k")!)).toEqual(["3", "2", "1"]);
    expect(s.toggle("2")).toBe("removed");
    expect(JSON.parse(data.get("k")!)).toEqual(["3", "1"]);
  });

  it("keeps separate lists under separate keys", () => {
    const a = createIdStore("a", 3);
    const b = createIdStore("b", 3);
    a.toggle("1");
    b.toggle("2");
    expect(JSON.parse(data.get("a")!)).toEqual(["1"]);
    expect(JSON.parse(data.get("b")!)).toEqual(["2"]);
  });

  it("drops anything that is not a digit id, and anything past the cap, when it reads a stored value", () => {
    const s = createIdStore("k", 2);
    expect(s.parse(JSON.stringify(["1", "x", "2", "1", "3"]))).toEqual(["1", "2"]);
    expect(s.parse("not json")).toEqual([]);
  });

  it("remove reads the current list, and set tells subscribers", () => {
    const s = createIdStore("k", 3);
    const seen = vi.fn();
    const stop = s.subscribe(seen);
    s.set(["1", "2", "3"]);
    s.remove(["2"]);
    expect(JSON.parse(data.get("k")!)).toEqual(["1", "3"]);
    expect(seen).toHaveBeenCalledTimes(2);
    stop();
  });

  it("restore puts removed ids back at the front and keeps what was added since", () => {
    const s = createIdStore("k", 3);
    s.set(["3", "2", "1"]);
    s.remove(["2"]);
    s.toggle("9"); // added after the removal
    expect(JSON.parse(data.get("k")!)).toEqual(["9", "3", "1"]);
    s.restore(["2"]);
    expect(JSON.parse(data.get("k")!)).toEqual(["2", "9", "3"]); // the cap of three keeps the newest-first order, dropping the oldest
    s.restore(["2"]); // already there: no duplicate
    expect(JSON.parse(data.get("k")!)).toEqual(["2", "9", "3"]);
  });
});
