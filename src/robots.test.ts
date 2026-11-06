import { afterEach, expect, test, vi } from "vitest";
import robots from "@/app/robots";

afterEach(() => vi.unstubAllEnvs());

const SHARE_BOTS = ["facebookexternalhit", "Facebot", "Twitterbot"];
const closed = [
  { userAgent: SHARE_BOTS, allow: "/" },
  { userAgent: "*", disallow: "/" },
];

test("production lets everyone in except /gone and names the sitemap", () => {
  vi.stubEnv("APP_ENV", "production");
  expect(robots()).toEqual({
    rules: { userAgent: "*", allow: "/", disallow: "/gone" },
    sitemap: "https://carright.cgaudino.com/sitemap.xml",
  });
});

test.each(["demo", ""])("APP_ENV %j blocks every crawler but the share-preview bots, with no sitemap", (env) => {
  vi.stubEnv("APP_ENV", env);
  expect(robots()).toEqual({ rules: closed });
});
