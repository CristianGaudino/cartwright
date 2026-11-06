import { z } from "zod";
import { describe, expect, it } from "vitest";
import { CONTACT_ERROR, LIMITS, leadSchema } from "./schema";

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
