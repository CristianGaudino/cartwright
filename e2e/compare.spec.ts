import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// A tap before React attaches does nothing.
async function ready(page: Page) {
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
// The first n car pages from the list, in order. Compare lives on the car page; the cards carry only the heart.
async function carPaths(page: Page, n: number) {
  await page.goto("/used-cars");
  const hrefs = await page.locator("article h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  return hrefs.slice(0, n);
}
async function compare(page: Page, path: string) {
  await page.goto(path);
  await ready(page);
  const button = page.getByTestId("buy-box").getByRole("button", { name: /^Compare / });
  await button.click();
  return button;
}

test("a card has no compare button, only the heart", async ({ page }) => {
  await page.goto("/used-cars");
  const card = page.locator("article").first();
  await expect(card.getByRole("button", { name: /^Compare/ })).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Save / })).toHaveCount(1);
});

test("pick two cars on their pages, open the compare page, remove one", async ({ page }) => {
  const [a, b] = await carPaths(page, 2);
  const first = await compare(page, a);
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await compare(page, b);
  const bar = page.getByRole("region", { name: "Compare cars" });
  await expect(bar).toContainText("2 of 3 to compare");
  await bar.getByRole("link", { name: "Compare" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole("heading", { level: 1, name: "Compare cars" })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  for (const row of ["Year", "Mileage", "Fuel", "Transmission", "Engine", "Body type"]) await expect(table.getByRole("rowheader", { name: row })).toBeVisible();
  await expect(page.getByRole("region", { name: "Compare cars" })).toHaveCount(0);
  await table.getByRole("button", { name: /^Remove/ }).first().click();
  await expect(table.getByRole("columnheader")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
});

test("a fourth car is refused and said so, and the list stays at three", async ({ page }) => {
  const paths = await carPaths(page, 4);
  for (const p of paths.slice(0, 3)) await compare(page, p);
  const fourth = await compare(page, paths[3]);
  await expect(fourth).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("You can compare up to three cars.")).toBeAttached();
  await expect(page.getByRole("region", { name: "Compare cars" })).toContainText("3 of 3 to compare");
});

test("the compare page is empty to start with and not indexed", async ({ page }) => {
  await page.goto("/compare");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
