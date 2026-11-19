import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSlotPath } from "@/lib/leads/photos";
import { freeDriveSlot, takenDriveTimes } from "./drives";

const holds = { free: vi.fn(async () => {}), times: vi.fn(async (): Promise<Date[]> => []) };
vi.mock("@/lib/leads/deps", () => ({ getDeps: () => ({ holds, photoLinkSecret: () => "secret" }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const lead = "00000000-0000-4000-8000-000000000001";
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-20T10:00:00Z") }));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("freeDriveSlot", () => {
  it("frees nothing for a bad signature, and the hold once for a good one", async () => {
    const { searchParams } = new URL(await signSlotPath(lead, new Date("2026-11-24T10:30:00Z"), "secret"), "https://example.test");
    const exp = searchParams.get("exp")!;
    await freeDriveSlot(form({ lead, exp, sig: "forged" }));
    expect(holds.free).not.toHaveBeenCalled();
    await freeDriveSlot(form({ lead, exp, sig: searchParams.get("sig")! }));
    expect(holds.free).toHaveBeenCalledExactlyOnceWith(lead);
  });
});

describe("takenDriveTimes", () => {
  it("answers none for a car id of the wrong shape, without asking the store", async () => {
    expect(await takenDriveTimes("x'")).toEqual([]);
    expect(holds.times).not.toHaveBeenCalled();
  });

  it("answers none when the store fails", async () => {
    holds.times.mockRejectedValueOnce(new Error("D1 down"));
    expect(await takenDriveTimes("4381995")).toEqual([]);
  });
});
