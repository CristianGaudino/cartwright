import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BAD_DRIVE_DAY, BAD_DRIVE_TIME, DRIVE_NOTICE_ERROR, DRIVE_PHONE_ERROR, TEST_DRIVE, driveDayLabel, driveDays, driveTimes, dublinMs, dublinSlot, emailKey, openDriveTimes, phoneKey } from "./constants";
import { leadSchema } from "./schema";

afterEach(() => vi.useRealTimers());
const at = (iso: string) => vi.useFakeTimers({ now: new Date(iso), toFake: ["Date"] });

describe("driveTimes, the slot grid", () => {
  it("runs hourly from an hour after opening, none later than an hour before closing, so one car's drives never overlap", () => {
    const tue = driveTimes("2026-11-24"); // Tuesday: 09:30 to 18:00
    expect(tue).toEqual(["10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"]); // 17:30 would end after closing
    expect(driveTimes("2026-11-28")).toEqual(["11:00", "12:00", "13:00", "14:00", "15:00"]); // Saturday: 10:00 to 16:00
    expect(TEST_DRIVE.stepMinutes).toBe(60);
  });
  it("is the same grid on the weeks the clocks change (the change itself falls on a closed Sunday)", () => {
    expect(["2026-03-28", "2026-03-30", "2026-10-24", "2026-10-26"].map((d) => driveTimes(d)[0])).toEqual(["11:00", "10:30", "11:00", "10:30"]);
    expect(driveTimes("2026-03-29")).toEqual([]);
    expect(driveTimes("2026-10-25")).toEqual([]);
    expect(new Date(dublinMs("2026-03-30", "10:30")).toISOString()).toBe("2026-03-30T09:30:00.000Z"); // summer time from the Monday
    expect(new Date(dublinMs("2026-10-24", "15:00")).toISOString()).toBe("2026-10-24T14:00:00.000Z"); // still summer time on the Saturday
    expect(new Date(dublinMs("2026-10-26", "10:30")).toISOString()).toBe("2026-10-26T10:30:00.000Z"); // winter time from the Monday
  });
  it("is empty on a closed day and for anything that is not a date", () => {
    expect(driveTimes("2026-11-29")).toEqual([]); // Sunday
    expect(driveTimes("2026-13-01")).toEqual([]);
    expect(driveTimes("tomorrow")).toEqual([]);
  });
});

describe("the hour's notice", () => {
  it("offers today's times only from an hour on, Irish time", () => {
    expect(openDriveTimes("2026-11-24", Date.parse("2026-11-24T10:00:00Z"))[0]).toBe("11:30");
    expect(openDriveTimes("2026-11-24", Date.parse("2026-11-24T10:30:00Z"))[0]).toBe("11:30"); // exactly an hour
    expect(openDriveTimes("2026-11-24", Date.parse("2026-11-24T10:31:00Z"))[0]).toBe("12:30");
    expect(openDriveTimes("2026-07-01", Date.parse("2026-07-01T09:00:00Z"))[0]).toBe("11:30"); // 10:00 in Irish summer time: 10:30 is too soon
    expect(openDriveTimes("2026-11-25", Date.parse("2026-11-24T16:00:00Z"))).toEqual(driveTimes("2026-11-25")); // another day: all of it
  });
});

describe("driveDays", () => {
  it("starts today while today has a time an hour away, skips Sundays and stops at the horizon", () => {
    const days = driveDays(new Date("2026-11-20T10:00:00Z")); // a Friday
    expect(days[0]).toBe("2026-11-20");
    expect(days).not.toContain("2026-11-22"); // Sunday
    expect(days.at(-1)).toBe("2026-12-04"); // 14 days on
    expect(days).toHaveLength(13);
  });
  it("drops today once its last time is less than an hour away", () => {
    expect(driveDays(new Date("2026-11-20T15:30:00Z"))[0]).toBe("2026-11-20"); // 16:30 is an hour away
    expect(driveDays(new Date("2026-11-20T15:31:00Z"))[0]).toBe("2026-11-21");
    expect(driveDays(new Date("2026-11-21T14:01:00Z"))[0]).toBe("2026-11-23"); // Saturday after 14:00, then Sunday is closed
  });
  it("uses the Irish date: just before midnight in summer, UTC is still the day before", () => {
    expect(driveDays(new Date("2026-07-01T23:30:00Z"))[0]).toBe("2026-07-02"); // 00:30 on 2 July in Ireland
  });
});

describe("phoneKey", () => {
  it("reads one number the same however it is written, a national 0 as Irish", () => {
    const key = "353871234567";
    for (const v of ["+353 87 123 4567", "+353 871234567", "087 123 4567", "087-123-4567", "(087) 123 4567", "00353 87 123 4567", "+353 (0)87 123 4567"]) expect(phoneKey(v)).toBe(key);
  });
  it("keeps different numbers and countries apart", () => {
    expect(phoneKey("+353 86 123 4567")).not.toBe(phoneKey("+353 87 123 4567"));
    expect(phoneKey("+44 7400 123456")).toBe("447400123456");
    expect(phoneKey("07400 123456")).toBe("3537400123456"); // a national 0 is read as Irish, never guessed as British
  });
});

describe("emailKey", () => {
  it("trims and lowercases, and is null when there is no email", () => {
    expect(emailKey(" Ann@Example.COM ")).toBe("ann@example.com");
    expect([emailKey(undefined), emailKey(""), emailKey("  ")]).toEqual([null, null, null]);
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
    for (const t of ["10:15", "09:30", "17:00", "17:30", "08:00", "x"]) expect(errors({ ...base, driveDate: "2026-11-24", driveTime: t }).driveTime).toEqual([BAD_DRIVE_TIME]);
  });
  it("takes today, but only a time at least an hour away", () => {
    at("2026-11-24T14:00:00Z"); // Tuesday, 14:00 in Ireland
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "15:30" })).toEqual({});
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "14:30" }).driveTime).toEqual([DRIVE_NOTICE_ERROR]);
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "13:30" }).driveTime).toEqual([DRIVE_NOTICE_ERROR]);
    expect(errors({ ...base, driveDate: "2026-11-23", driveTime: "15:30" }).driveDate).toEqual([BAD_DRIVE_DAY]);
  });
  it("still takes the day a form opened before midnight offered", () => {
    // Opened on Monday at 23:50, sent at 00:10 on Tuesday: Tuesday and the last day of Monday's list are both still fine.
    at("2026-11-24T00:10:00Z");
    expect(errors({ ...base, driveDate: "2026-11-24", driveTime: "10:30" })).toEqual({});
    expect(errors({ ...base, driveDate: "2026-12-07", driveTime: "10:30" })).toEqual({}); // 23 Nov + 14
    expect(errors({ ...base, driveDate: "2026-12-09", driveTime: "10:30" }).driveDate).toEqual([BAD_DRIVE_DAY]);
  });
  it("needs a phone, since the dealer calls to confirm, and a car", () => {
    at("2026-11-20T10:00:00Z");
    const e = errors({ ...base, phone: "", email: "ann@example.com", carId: undefined, driveDate: "2026-11-24", driveTime: "10:30" });
    expect(e.phone).toEqual([DRIVE_PHONE_ERROR]);
    expect(e.carId).toBeDefined();
  });
});
