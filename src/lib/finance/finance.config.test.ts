import { afterEach, expect, test, vi } from "vitest";
import { isProduction } from "@/lib/site";
import { FINANCE } from "./finance.config";

afterEach(() => vi.unstubAllEnvs());

// D-16: placeholder figures must never go live. deploy.yml runs npm test with its job APP_ENV, so this fails the deploy
// once APP_ENV is production until the dealer's terms replace the placeholder.
const guard = (config: { placeholder: boolean }) => {
  if (isProduction()) expect(config.placeholder, "finance.config.ts still holds placeholder figures").toBe(false);
};

test("the live config is not a placeholder in production", () => {
  guard(FINANCE);
});

test("the guard fails a placeholder config in production and lets it through elsewhere", () => {
  vi.stubEnv("APP_ENV", "production");
  expect(() => guard({ placeholder: true })).toThrow();
  expect(() => guard({ placeholder: false })).not.toThrow();
  vi.stubEnv("APP_ENV", "demo");
  expect(() => guard({ placeholder: true })).not.toThrow();
});
