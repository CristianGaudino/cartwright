import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Demo = { slug: string; make: string; makeSlug: string; modelSlug: string; bodySlug?: string; bodyType?: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8"));
const inStock = cars.filter((c) => !c.soldAt);
const ORIGIN = "https://carright.cgaudino.com";

// The most-stocked value of a field; the first one wins a tie.
function top(key: "makeSlug" | "bodySlug") {
  const counts = new Map<string, number>();
  for (const c of inStock) if (c[key]) counts.set(c[key]!, (counts.get(c[key]!) ?? 0) + 1);
  const [slug, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return { slug, n, car: inStock.find((c) => c[key] === slug)! };
}
const { slug: topSlug, n, car: topCar } = top("makeSlug");
const topMake = topCar.make;
const { slug: topBody, car: bodyCar } = top("bodySlug");

// The link targets inside a chip section, found by its heading.
const chipHrefs = (page: Page, heading: string) =>
  page
    .locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) })
    .locator("li a")
    .evaluateAll((els) => els.map((e) => e.getAttribute("href")!));

async function expectLandingMeta(page: Page, path: string) {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}${path}`);
  const scripts = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)));
  expect(scripts).toHaveLength(1);
  expect(scripts[0]["@type"]).toBe("ItemList");
}

test("a make page has its own heading, title, intro and cars", async ({ page }) => {
  const res = await page.goto(`/used-cars/${topSlug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Used ${topMake}`);
  await expect(page.getByText(`We have ${n} used ${topMake} in stock in Tralee`)).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`^Used ${topMake} for sale in Tralee`));
  const links = page.locator("article h2 a");
  await expect(links).toHaveCount(Math.min(12, n));
  for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) expect(href).toMatch(new RegExp(`^/used-cars/${topSlug}-`));
  const all = page.getByRole("link", { name: `See all ${n} ${topMake}` });
  if (n > 12) await expect(all).toHaveAttribute("href", `/used-cars?make=${topSlug}`);
  else await expect(all).toHaveCount(0);
});

test("a car slug still opens the car page and an unknown slug is 404", async ({ request }) => {
  expect((await request.get(`/used-cars/${inStock[0].slug}`)).status()).toBe(200);
  expect((await request.get("/used-cars/not-a-car")).status()).toBe(404);
});

test("a body type page lists makes that open make pages", async ({ page, request }) => {
  await page.goto(`/used-cars/${topBody}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Used ${bodyCar.bodyType} cars`);
  await expectLandingMeta(page, `/used-cars/${topBody}`);
  const hrefs = await chipHrefs(page, "Makes");
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
});

test("a make page links to its models, which open make and model pages", async ({ page, request }) => {
  await page.goto(`/used-cars/${topSlug}`);
  await expectLandingMeta(page, `/used-cars/${topSlug}`);
  const models = await chipHrefs(page, "Models");
  expect(models.length).toBeGreaterThan(0);
  for (const href of models) expect((await request.get(href)).status(), href).toBe(200);
  expect((await chipHrefs(page, "Body types")).length).toBeGreaterThan(0);

  await page.goto(models[0]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(new RegExp(`^Used ${topMake} \\S`));
  await expectLandingMeta(page, models[0]);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).locator('[aria-current="page"]')).toBeVisible();
  await expect(page.getByRole("link", { name: `All ${topMake}`, exact: true })).toHaveAttribute("href", `/used-cars/${topSlug}`);
});

test("unknown models and extra segments are 404", async ({ request }) => {
  const car = inStock.find((c) => c.bodySlug)!;
  expect((await request.get(`/used-cars/${topSlug}/not-a-model`)).status()).toBe(404);
  expect((await request.get(`/used-cars/${car.bodySlug}/${car.modelSlug}`)).status()).toBe(404);
  expect((await request.get(`/used-cars/${car.slug}/anything`)).status()).toBe(404);
});

test("a make page does not scroll sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/used-cars/${topSlug}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
