import { describe, expect, it } from "vitest";
import { BAD_KM, BAD_REG, PHOTO_MIN_COUNT, PHOTO_MIN_ERROR } from "@/lib/leads/constants";
import { fieldErrors } from "@/lib/leads/validate";
import { TRADE_IN_STEPS } from "./TradeInFields";

// The typed fields of a step are checked with the server's own rules (validate.ts), which also wants a name and consent: those come
// from the last step, so these tests only read the errors of the first step's fields.
const first = (values: Record<string, string>) => {
  const all = fieldErrors("trade_in", { name: "A", phone: "087 123 4567", consent: "yes", ...values });
  return Object.fromEntries(TRADE_IN_STEPS[0].fields.filter((f) => all[f]).map((f) => [f, all[f]]));
};

describe("trade-in step one, by the server's rules", () => {
  it("passes a reg in any case and a mileage with commas", () => {
    expect(first({ reg: "191-ky-1234", mileage: "120,500" })).toEqual({});
  });

  it("refuses a missing or odd reg and says what the server says", () => {
    expect(first({ mileage: "100" })).toEqual({ reg: [BAD_REG] });
    expect(first({ reg: "191/KY/1234", mileage: "100" })).toEqual({ reg: [BAD_REG] });
    expect(first({ reg: "1".repeat(13), mileage: "100" })).toEqual({ reg: [BAD_REG] });
  });

  it("refuses a mileage that is not digits, or too long, or empty", () => {
    for (const mileage of ["12a", "1.5", "1234567", ""]) expect(first({ reg: "191-KY-1234", mileage }), mileage).toEqual({ mileage: [BAD_KM] });
    expect(first({ reg: "191-KY-1234" })).toEqual({ mileage: [BAD_KM] }); // not typed at all
  });

  it("lists both when both are wrong", () => {
    expect(first({})).toEqual({ reg: [BAD_REG], mileage: [BAD_KM] });
  });
});

describe("trade-in photos step", () => {
  const photos = TRADE_IN_STEPS[2].check!;
  it("needs the minimum number of photos, with the server's words", () => {
    expect(photos({ photos: PHOTO_MIN_COUNT - 1 })).toEqual({ photos: [PHOTO_MIN_ERROR] });
    expect(photos({ photos: PHOTO_MIN_COUNT })).toBeUndefined();
    expect(photos({ photos: 12 })).toBeUndefined();
  });
});

describe("trade-in steps", () => {
  it("own the fields the server may name, so a server error can send the buyer back to the right step", () => {
    const owned = TRADE_IN_STEPS.flatMap((s) => s.fields);
    for (const f of ["reg", "mileage", "make", "model", "year", "message", "photos", "name", "phone", "email", "consent"]) expect(owned, f).toContain(f);
  });
});
