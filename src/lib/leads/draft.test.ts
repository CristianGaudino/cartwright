import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftOf, readDraft, saveDraft } from "./draft";

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) });
});
afterEach(() => vi.unstubAllGlobals());

describe("lead form drafts", () => {
  it("never keeps the contact details or the consent, nor blanks or what the page filled in", () => {
    expect(draftOf({ name: "Ann", phone: "087", email: "a@b.ie", consent: "yes", message: "Hi", model: " ", make: "Audi", alertKind: "price-drop" }, { alertKind: "price-drop" })).toEqual({ message: "Hi", make: "Audi" });
  });

  it("round-trips, and a sent form (back to its prefill) removes the draft", () => {
    saveDraft("k", { message: "A red one", email: "a@b.ie" });
    expect(readDraft("k")).toEqual({ message: "A red one" });
    saveDraft("k", { alertKind: "x" }, { alertKind: "x" });
    expect(data.has("k")).toBe(false);
  });

  it("what was typed wins over the same prefill, and gives way when the page fills that field differently", () => {
    saveDraft("k", { make: "Audi", message: "Low miles" }, { make: "Volkswagen" });
    expect(readDraft("k", { make: "Volkswagen" })).toEqual({ make: "Audi", message: "Low miles" });
    expect(readDraft("k", { make: "BMW" })).toEqual({ message: "Low miles" });
    expect(readDraft("k")).toEqual({ message: "Low miles" });
  });

  it("starts empty on anything it did not write", () => {
    data.set("k", "not json");
    expect(readDraft("k")).toEqual({});
    data.set("k", JSON.stringify({ message: "old shape" }));
    expect(readDraft("k")).toEqual({});
    data.set("k", JSON.stringify({ for: [], values: { message: 5, email: "a@b.ie", model: "Golf" } }));
    expect(readDraft("k")).toEqual({ model: "Golf" });
  });
});
