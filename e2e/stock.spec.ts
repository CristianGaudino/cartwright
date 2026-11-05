import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const PER_PAGE = 12;
const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));

async function total(page: Page) {
  const text = (await page.getByTestId("count").textContent()) ?? "";
  expect(text).toMatch(/^(No cars|1 car|\d+ cars)$/);
  return text === "No cars" ? 0 : digits(text) || 1;
}

const prices = (page: Page) => page.locator("article > div:last-child > p:first-child").allTextContents().then((l) => l.map(digits));

test("lists the cars, price first, 12 per page", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.getByRole("heading", { level: 1, name: "Used cars" })).toBeVisible();
  const n = await total(page);
  await expect(page.locator("article")).toHaveCount(Math.min(PER_PAGE, n));
  for (const p of await page.locator("article > div:last-child > p:first-child").allTextContents()) expect(p).toMatch(/^€[\d,]+$/);
});

test("sort and page come from the URL", async ({ page }) => {
  await page.goto("/used-cars?sort=price-asc");
  const asc = await prices(page);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.goto("/used-cars?sort=price-desc");
  const desc = await prices(page);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));

  await page.goto("/used-cars");
  const n = await total(page);
  if (n > PER_PAGE) {
    await page.goto("/used-cars?page=2");
    await expect(page.getByText(`Page 2 of ${Math.ceil(n / PER_PAGE)}`)).toBeVisible();
  }
});

test("unknown params and bad values are ignored", async ({ page, request }) => {
  await page.goto("/used-cars");
  const n = await total(page);
  const res = await request.get("/used-cars?sort=bogus&yearFrom=abc&make=%3Cscript%3E&foo=bar");
  expect(res.status()).toBe(200);
  await page.goto("/used-cars?sort=bogus&yearFrom=abc&make=%3Cscript%3E&foo=bar");
  expect(await total(page)).toBe(n);
});
