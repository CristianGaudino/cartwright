import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Demo = { slug: string; make: string; makeSlug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
// 02-01 sets the oldest sale date 120 days back, so this car is always past the window.
const expired = cars.filter((c) => c.soldAt).sort((a, b) => Date.parse(a.soldAt!) - Date.parse(b.soldAt!))[0];
const live = cars.find((c) => !c.soldAt)!;

test("an expired car answers 410 with a body that links on", async ({ request }) => {
  const res = await request.get(`/used-cars/${expired.slug}`);
  expect(res.status()).toBe(410);
  const body = await res.text();
  expect(body).toContain("This Car Is No Longer Available");
  expect(body).toContain(`href="/used-cars/${expired.makeSlug}"`);
});

test("the 410 page shows the way on and is noindex", async ({ page }) => {
  await page.goto(`/used-cars/${expired.slug}`);
  await expect(page.getByRole("heading", { name: "This Car Is No Longer Available" })).toBeVisible();
  await expect(page.getByRole("link", { name: `See more ${expired.make}` })).toHaveAttribute("href", `/used-cars/${expired.makeSlug}`);
  await expect(page.getByRole("link", { name: "See all used cars" })).toHaveAttribute("href", "/used-cars");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("a live car still answers 200", async ({ request }) => {
  expect((await request.get(`/used-cars/${live.slug}`)).status()).toBe(200);
});

test("the 404 page says so and links to the list", async ({ page }) => {
  await page.goto("/used-cars/not-a-car");
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See all used cars" })).toHaveAttribute("href", "/used-cars");
});

test("a slug the provider never had answers 404, even one ending in digits", async ({ request }) => {
  expect((await request.get("/used-cars/audi-a4-2019-999999999")).status()).toBe(404);
  expect((await request.get("/gone/not-a-make")).status()).toBe(404);
});
