import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// A tap before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const compareButtons = (page: Page) => page.getByRole("button", { name: /^Compare (?!cars)/ });

test("pick two cars on the list, open the compare page, remove one", async ({ page }) => {
  await open(page, "/used-cars");
  await compareButtons(page).nth(0).click();
  await compareButtons(page).nth(1).click();
  await expect(page).toHaveURL(/\/used-cars$/); // the button is not a card tap
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
  await open(page, "/used-cars");
  for (let i = 0; i < 3; i++) await compareButtons(page).nth(i).click();
  await compareButtons(page).nth(3).click();
  await expect(compareButtons(page).nth(3)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("You can compare up to three cars.")).toBeAttached();
  await expect(page.getByRole("region", { name: "Compare cars" })).toContainText("3 of 3 to compare");
});

test("the compare page is empty to start with, not indexed, and a car page has a Compare button", async ({ page }) => {
  await open(page, "/compare");
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/used-cars");
  await page.locator("article a").first().click();
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const button = page.getByTestId("buy-box").getByRole("button", { name: /^Compare / });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Compare cars" })).toContainText("1 of 3 to compare");
});
