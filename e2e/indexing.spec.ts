import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// The build under test and this runner get the same APP_ENV (CI's e2e job sets production).
const production = process.env.APP_ENV === "production";

const robotsMeta = (page: Page) => page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));

async function expectIndexing(page: Page, path: string, indexed: boolean) {
  await page.goto(path);
  const robots = await robotsMeta(page);
  const noindex = robots.some((c) => c.includes("noindex"));
  expect(noindex, `${path} robots meta: ${robots.join(" | ")}`).toBe(!indexed);
}

const ORIGIN = "https://carright.cgaudino.com";
const cars: { slug: string; soldAt?: string }[] = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8"));
const loc = (path: string) => `<loc>${ORIGIN}${path}</loc>`;
const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute("href");

test("robots.txt follows APP_ENV", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  if (production) {
    expect(body).toContain("Disallow: /gone");
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  } else {
    expect(body).toMatch(/facebookexternalhit/i);
    expect(body).toMatch(/user-agent: \*\s+disallow: \/\s*$/i);
    expect(body).not.toMatch(/sitemap:/i);
  }
});

test("sitemap lists the visible cars in production and nothing otherwise", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  if (!production) return expect(body).not.toContain("<url>");
  expect(body).not.toMatch(/lastmod/i);
  expect(body).toContain(loc("/used-cars"));
  for (const c of cars.filter((c) => !c.soldAt)) expect(body).toContain(loc(`/used-cars/${c.slug}`));
  const oldest = cars.filter((c) => c.soldAt).sort((a, b) => a.soldAt!.localeCompare(b.soldAt!))[0];
  expect(body).not.toContain(loc(`/used-cars/${oldest.slug}`));
});

test("the list is indexable only without a query string, and always canonical to the bare list", async ({ page }) => {
  await expectIndexing(page, "/used-cars", production);
  expect(await canonical(page)).toBe(`${ORIGIN}/used-cars`);
  await expectIndexing(page, "/used-cars?sort=price-asc", false);
  expect(await canonical(page)).toBe(`${ORIGIN}/used-cars`);
});

test("car pages and the home page follow APP_ENV", async ({ page }) => {
  await page.goto("/used-cars");
  const href = await page.locator('article a[href^="/used-cars/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  await expectIndexing(page, href!, production);
  await expectIndexing(page, "/", production);
});
