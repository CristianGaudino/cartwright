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

test("header: logo, one link, scrolls away", async ({ page }) => {
  await page.goto("/used-cars");
  const header = page.getByRole("banner");
  await expect(header.getByRole("img", { name: "Cartwright" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Used cars" })).toHaveAttribute("href", "/used-cars");
  expect(await header.evaluate((el) => getComputedStyle(el).position)).toMatch(/^(static|relative)$/);
});

test("every card links to a real car page, unknown slugs 404", async ({ page, request }) => {
  await page.goto("/used-cars");
  const n = await total(page);
  for (let p = 1; p <= Math.ceil(n / PER_PAGE); p++) {
    await page.goto(`/used-cars?page=${p}`);
    for (const href of await page.locator("article h2 a").evaluateAll((a) => a.map((x) => x.getAttribute("href")))) {
      expect(href).toMatch(/^\/used-cars\/[a-z0-9-]+$/);
      expect((await request.get(href!)).status(), href!).toBe(200);
    }
  }
  expect((await request.get("/used-cars/not-a-car")).status()).toBe(404);
});

test("a car page shows title, price and a way back", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article h2 a").first().click();
  await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^€[\d,]+$/)).toBeVisible();
  await page.getByRole("link", { name: "Back to used cars" }).click();
  await expect(page).toHaveURL(/\/used-cars$/);
});

test.describe("320px wide", () => {
  test.use({ viewport: { width: 320, height: 640 } });
  test("no sideways scroll on the stock page or a car page", async ({ page }) => {
    for (const path of ["/used-cars", null]) {
      if (path) await page.goto(path);
      else {
        await page.locator("article h2 a").first().click();
        await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
      }
      await page.waitForLoadState("load");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
  });
});
