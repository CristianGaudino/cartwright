import { describe, expect, it } from "vitest";
import { fieldErrors } from "./validate";

describe("fieldErrors", () => {
  it("has nothing to say about fields that pass (the form reads only the step's own fields)", () => {
    const errors = fieldErrors("trade_in", { reg: "191-KY-1234", mileage: "120500" });
    expect(errors.reg).toBeUndefined();
    expect(errors.mileage).toBeUndefined();
  });
  it("names each field that fails, in the server's words", () => {
    const errors = fieldErrors("trade_in", { reg: "", mileage: "" });
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["reg", "mileage"]));
  });
  it("does not flag the hidden fields it fills itself", () => {
    expect(Object.keys(fieldErrors("trade_in", { reg: "191-KY-1234", mileage: "1" }))).not.toContain("clientRef");
  });
});
