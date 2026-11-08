import { describe, expect, it } from "vitest";
import { BAD_KM, BAD_REG } from "@/lib/leads/constants";
import { TRADE_IN_STEPS } from "./TradeInFields";

// The first step checks the two required answers before the server sees them, with the server's own rules and words.
const check = TRADE_IN_STEPS[0].check!;

describe("trade-in step one check", () => {
  it("passes a reg in any case and a mileage with commas", () => {
    expect(check({ reg: "191-ky-1234", mileage: "120,500" })).toEqual({});
  });

  it("refuses a missing or odd reg and says what the server says", () => {
    expect(check({ mileage: "100" })).toEqual({ reg: [BAD_REG] });
    expect(check({ reg: "191/KY/1234", mileage: "100" })).toEqual({ reg: [BAD_REG] });
    expect(check({ reg: "1".repeat(13), mileage: "100" })).toEqual({ reg: [BAD_REG] });
  });

  it("refuses a mileage that is not digits, or too long, or empty", () => {
    for (const mileage of ["12a", "1.5", "1234567", ""]) expect(check({ reg: "191-KY-1234", mileage }), mileage).toEqual({ mileage: [BAD_KM] });
    expect(check({ reg: "191-KY-1234" })).toEqual({ mileage: [BAD_KM] }); // not typed at all
  });

  it("lists both when both are wrong", () => {
    expect(check({})).toEqual({ reg: [BAD_REG], mileage: [BAD_KM] });
  });

  it("owns the fields the server may name, so a server error can send the buyer back to the right step", () => {
    const owned = TRADE_IN_STEPS.flatMap((s) => s.fields);
    for (const f of ["reg", "mileage", "make", "model", "year", "message", "photos", "name", "phone", "email", "consent"]) expect(owned, f).toContain(f);
  });
});
