import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));
afterEach(() => vi.unstubAllGlobals());

describe("verifyTurnstile", () => {
  it("passes only a successful check for the lead action, sending the secret, token and IP", async () => {
    const fetch = reply({ success: true, action: "lead" });
    vi.stubGlobal("fetch", fetch);
    expect(await verifyTurnstile("tok", "203.0.113.1", "sec")).toBe(true);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({ secret: "sec", response: "tok", remoteip: "203.0.113.1" });
  });

  it.each([
    ["a failed check", { success: false, action: "lead" }],
    ["another action", { success: true, action: "login" }],
    ["no action", { success: true }],
  ])("refuses %s", async (_, body) => {
    vi.stubGlobal("fetch", reply(body));
    expect(await verifyTurnstile("tok", "203.0.113.1", "sec")).toBe(false);
  });

  it("fails closed when the request throws or the answer is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await verifyTurnstile("tok", "", "sec")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>")));
    expect(await verifyTurnstile("tok", "", "sec")).toBe(false);
  });

  it("refuses an empty or over-long token without a request", async () => {
    const fetch = reply({ success: true, action: "lead" });
    vi.stubGlobal("fetch", fetch);
    expect(await verifyTurnstile("", "", "sec")).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), "", "sec")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
