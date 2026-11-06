import { afterEach, expect, test, vi } from "vitest";
import robots from "@/app/robots";

afterEach(() => vi.unstubAllEnvs());

test("robots blocks everything outside production", () => {
  vi.stubEnv("APP_ENV", "");
  expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
});

test("robots lets crawlers in only when APP_ENV is production", () => {
  vi.stubEnv("APP_ENV", "production");
  expect(robots().rules).toEqual({ userAgent: "*", allow: "/" });
});
