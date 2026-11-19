import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BAD_DRIVE_DAY, BAD_DRIVE_TIME, DRIVE_PHONE_ERROR, TEST_DRIVE, driveDayLabel, driveDays, driveTimes, dublinMs, dublinSlot } from "./constants";
import { leadSchema } from "./schema";

afterEach(() => vi.useRealTimers());
const at = (iso: string) => vi.useFakeTimers({ now: new Date(iso), toFake: ["Date"] });

describe("driveTimes, the slot grid", () => {
  it("runs from opening until an hour before closing, an hour apart, so one car's drives never overlap", () => {
    const tue = driveTimes("2026-11-24"); // Tuesday: 09:30 to 18:00
    expect([tue[0], tue[1], tue.at(-1), tue.length]).toEqual(["09:30", "10:30", "16:30", 8]);
    const sat = driveTimes("2026-11-28"); // Saturday: 10:00 to 16:00
    expect([sat[0], sat.at(-1)]).toEqual(["10:00", "15:00"]);
    expect(TEST_DRIVE.stepMinutes).toBe(60);
  });
  it("is empty on a closed day and for anything that is not a date", () => {
    expect(driveTimes("2026-11-29")).toEqual([]); // Sunday
    expect(driveTimes("2026-13-01")).toEqual([]);
    expect(driveTimes("tomorrow")).toEqual([]);
  });
});

describe("driveDays", () => {
  it("starts tomorrow, skips Sundays and stops at the horizon", () => {
    const days = driveDays(new Date("2026-11-20T10:00:00Z")); // a Friday
    expect(days[0]).toBe("2026-11-21");
    expect(days).not.toContain("2026-11-20");
    expect(days).not.toContain("2026-11-22"); // Sunday
    expect(days.at(-1)).toBe("2026-12-04"); // 14 days on
    expect(days).toHaveLength(12);
  });
  it("uses the Irish date: just before midnight in summer, UTC is still the day before", () => {
    expect(driveDays(new Date("2026-07-01T23:30:00Z"))[0]).toBe("2026-07-03"); // 00:30 on 2 July in Ireland
  });
});

describe("Irish time, across the clock changes (Europe/Dublin)", () => {
  it("turns wall time into the right instant in winter, in summer and on the change days", () => {
    expect(new Date(dublinMs("2026-12-01", "10:00")).toISOString()).toBe("2026-12-01T10:00:00.000Z");
    expect(new Date(dublinMs("2026-07-01", "10:00")).toISOString()).toBe("2026-07-01T09:00:00.000Z");
    expect(new Date(dublinMs("2026-03-29", "10:00")).toISOString()).toBe("2026-03-29T09:00:00.000Z"); // clocks went forward at 01:00
    expect(new Date(dublinMs("2026-10-25", "10:00")).toISOString()).toBe("2026-10-25T10:00:00.000Z"); // clocks went back at 02:00
    expect(dublinMs("2026-03-29", "01:30")).toBeNaN(); // skipped
  });
  it("reads an instant back as the same wall time", () => {
    for (const [d, t] of [["2026-03-28", "09:30"], ["2026-03-30", "17:00"], ["2026-10-24", "15:00"], ["2026-10-26", "09:30"]]) expect(dublinSlot(dublinMs(d, t))).toBe(`${d} ${t}`);
  });
  it("labels a day short for the list and long for the email", () => {
    expect(driveDayLabel("2026-11-24")).toBe("Tue 24 Nov");
    expect(driveDayLabel("2026-11-24", true)).toBe("Tuesday 24 November 2026");
  });
});

describe("leadSchema for a test drive", () => {
  const base = { type: "test_drive", carId: "123", clientRef: crypto.randomUUID(), sourcePath: "/used-cars/x", name: "Ann", phone: "087 123 4567", consent: "yes" };
  const errors = (input: Record<string, unknown>) => {
    const r = leadSchema.safeParse(input);
    return r.success ? {} : (z.flattenError(r.error).fieldErrors as Record<string, string[]>);
  };

  it("takes a day and a time on the grid, and keeps them as typed", () => {
    at("2026-11-20T10:00:00Z");
    const r = leadSchema.safeParse({ ...base, driveDate: "2026-11-24", driveTime: "10:30" });
    expect(r.success && r.data).toMatchObject({ driveDate: "2026-11-24", driveTime: "10:30" });
  });
  it("refuses a closed day, a day past the horizon, and no day", () => {
    at("2026-11-20T10:00:00Z");
    expect(errors({ ...base, driveDate: "2026-11-22", driveTime: "10:30" }).driveDate).toEqual([BAD_DRIVE_DAY]); // Sunday
    expect(errors({ ...base, driveDate: "2026-12-15", driveTime: "10:30" }).driveDate).toEqual([BAD_DRIVE_DAY]);
    expect(errors({ ...base, driveTime: "10:30" }).driveDate).toEqual([BAD_DRIVE_DAY]);
  });
  it("refuses a time off the grid or outside the hours", () => {
    at("2026-11-20T10:00:00Z");
    for (const t of ["10:15", "17:30", "08:00", "x"]) expect(errors({ ...base, driveDate: "2026-11-24", driveTime: t }).driveTime).toEqual([BAD_DRIVE_TIME]);
  });
  it("takes tomorrow from a form opened yesterday, but never a time that has passed", () => {
    at("2026-11-24T14:00:00Z"); // Tuesday, 14:00 in Ireland: the form opened on Monday offered today
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "15:30" })).toEqual({});
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "13:30" }).driveTime).toEqual([BAD_DRIVE_TIME]);
    expect(errors({ ...base, driveDate: "2026-11-23", driveTime: "15:00" }).driveDate).toEqual([BAD_DRIVE_DAY]);
  });
  it("needs a phone, since the dealer calls to confirm, and a car", () => {
    at("2026-11-20T10:00:00Z");
    const e = errors({ ...base, phone: "", email: "ann@example.com", carId: undefined, driveDate: "2026-11-24", driveTime: "10:30" });
    expect(e.phone).toEqual([DRIVE_PHONE_ERROR]);
    expect(e.carId).toBeDefined();
  });
});
