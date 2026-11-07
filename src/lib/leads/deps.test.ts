import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getDeps } = await import("./deps");

afterEach(() => vi.unstubAllEnvs());

describe("the real lead dependencies", () => {
  it("refuse a lead before storing it when there is no address to email, so none is saved unseen", async () => {
    vi.stubEnv("E2E_FAKE_BACKENDS", "");
    vi.stubEnv("LEAD_TO_EMAIL", "");
    await expect(getDeps().store.insert({} as never)).rejects.toThrow("Missing LEAD_TO_EMAIL");
    vi.stubEnv("LEAD_TO_EMAIL", "dealer@example.com");
    // Past the email check, the next missing thing is the database binding (there is none outside the Worker).
    await expect(getDeps().store.insert({} as never)).rejects.toThrow("Missing binding DB");
  });

  it("do not rate limit a request with no IP, which would lock every buyer into one shared bucket", async () => {
    vi.stubEnv("E2E_FAKE_BACKENDS", "");
    await expect(getDeps().limiter.allow("")).resolves.toBe(true);
    await expect(getDeps().limiter.allow("1.2.3.4")).rejects.toThrow("Missing binding LEAD_LIMITER");
  });
});
