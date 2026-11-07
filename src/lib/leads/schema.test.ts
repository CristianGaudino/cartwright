import { z } from "zod";
import { describe, expect, it } from "vitest";
import { CONTACT_ERROR, LIMITS, tomorrow } from "./constants";
import { leadSchema } from "./schema";

const base = { type: "enquiry", carId: "123", clientRef: crypto.randomUUID(), sourcePath: "/used-cars/x", name: "Ann", phone: "087 123 4567", consent: "yes" };
const errors = (input: Record<string, unknown>) => {
  const r = leadSchema.safeParse(input);
  return r.success ? {} : (z.flattenError(r.error).fieldErrors as Record<string, string[]>);
};

describe("leadSchema error copy (UI-SPEC)", () => {
  it("asks for a name", () => {
    expect(errors({ ...base, name: "" }).name).toEqual(["Enter your name."]);
    expect(errors({ ...base, name: "   " }).name).toEqual(["Enter your name."]);
  });

  it("asks for a phone or an email, once, on the email field", () => {
    const e = errors({ ...base, phone: "", email: "" });
    expect(e.email).toEqual([CONTACT_ERROR]);
    expect(CONTACT_ERROR).toBe("Add a phone number or an email.");
    expect(e.phone).toBeUndefined();
  });

  it.each(["12-34", "-------", "(((((((", "call me", "087 123 456a"])("refuses the phone %s", (phone) => {
    expect(errors({ ...base, phone }).phone).toEqual(["Enter a phone number we can call."]);
  });

  it.each(["087 123 4567", "+353 87 123 4567", "(066) 712-3456"])("takes the phone %s", (phone) => {
    expect(errors({ ...base, phone })).toEqual({});
  });

  it("refuses a bad email", () => {
    expect(errors({ ...base, email: "name@" }).email).toEqual(["Enter an email like name@example.com."]);
  });

  it("needs the consent box", () => {
    expect(errors({ ...base, consent: undefined }).consent).toEqual(["Tick the box to send your request."]);
    expect(errors({ ...base, consent: "no" }).consent).toEqual(["Tick the box to send your request."]);
  });

  it("refuses over-long fields at the limits", () => {
    expect(errors({ ...base, name: "a".repeat(LIMITS.name) })).toEqual({});
    expect(errors({ ...base, name: "a".repeat(LIMITS.name + 1) }).name).toBeDefined();
    expect(errors({ ...base, phone: "1".repeat(LIMITS.phone + 1) }).phone).toBeDefined();
    expect(errors({ ...base, email: `${"a".repeat(LIMITS.email)}@example.com` }).email).toBeDefined();
    expect(errors({ ...base, message: "a".repeat(LIMITS.message) })).toEqual({});
    expect(errors({ ...base, message: "a".repeat(LIMITS.message + 1) }).message).toBeDefined();
  });

  it("takes an enquiry with only a phone, or only an email", () => {
    expect(errors(base)).toEqual({});
    expect(errors({ ...base, phone: undefined, email: "ann@example.com" })).toEqual({});
  });
});

describe("test drive and reserve (D-10, D-11)", () => {
  const drive = { ...base, type: "test_drive" };
  const now = new Date("2026-11-06T23:30:00Z"); // 23:30 in Tralee

  it("works out tomorrow in Irish time", () => {
    expect(tomorrow(now)).toBe("2026-11-07");
    expect(tomorrow(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-03"); // already 00:30 on 2 July in summer time
  });

  it("takes a day from tomorrow on, and any time by default", () => {
    const r = leadSchema.parse({ ...drive, preferredDay: tomorrow() });
    expect(r).toMatchObject({ type: "test_drive", preferredDay: tomorrow(), preferredTime: "any" });
    expect(leadSchema.parse({ ...drive, preferredDay: "", preferredTime: "morning" })).toMatchObject({ preferredDay: undefined, preferredTime: "morning" });
  });

  it("refuses a past or made-up day and an unknown time", () => {
    expect(errors({ ...drive, preferredDay: "2020-01-01" }).preferredDay).toEqual(["Choose a day from tomorrow on."]);
    expect(errors({ ...drive, preferredDay: "2099-13-45" }).preferredDay).toBeDefined();
    expect(errors({ ...drive, preferredTime: "midnight" }).preferredTime).toEqual(["Choose a time from the list."]);
  });

  it("takes a reserve request with no extra fields, and drops any it is sent", () => {
    const r = leadSchema.parse({ ...base, type: "reserve", preferredDay: "2020-01-01", price: "1" });
    expect(Object.keys(r).sort()).toEqual(["carId", "clientRef", "consent", "name", "phone", "sourcePath", "type"]);
  });
});
