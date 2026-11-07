import { afterEach, expect, test, vi } from "vitest";
import { DEALER_FACTS_CONFIRMED, isProduction } from "@/lib/site";

afterEach(() => vi.unstubAllEnvs());

// D-09: placeholder dealer facts must never go live. deploy.yml runs npm test with its job APP_ENV, so this fails a
// production deploy until the dealer's facts replace the placeholders and DEALER_FACTS_CONFIRMED is set.
const guard = (confirmed: boolean) => {
  if (isProduction()) expect(confirmed, "site.ts still holds placeholder dealer facts").toBe(true);
};

test("the live dealer facts are confirmed in production", () => {
  guard(DEALER_FACTS_CONFIRMED);
});

test("the guard fails unconfirmed facts in production and lets them through elsewhere", () => {
  vi.stubEnv("APP_ENV", "production");
  expect(() => guard(false)).toThrow();
  expect(() => guard(true)).not.toThrow();
  vi.stubEnv("APP_ENV", "demo");
  expect(() => guard(false)).not.toThrow();
});
