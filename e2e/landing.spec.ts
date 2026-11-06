import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Demo = { slug: string; make: string; makeSlug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8"));
const inStock = cars.filter((c) => !c.soldAt);

// The make with the most cars in stock; the first one wins a tie.
const counts = new Map<string, number>();
for (const c of inStock) counts.set(c.makeSlug, (counts.get(c.makeSlug) ?? 0) + 1);
const [topSlug, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
const topMake = inStock.find((c) => c.makeSlug === topSlug)!.make;

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
