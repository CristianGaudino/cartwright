import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A tap before React attaches does nothing.
async function open(page: Page) {
  await page.goto("/sell-your-car");
  await page.waitForFunction(() => Object.keys(document.querySelector("form")!).some((k) => k.startsWith("__reactFiber")));
}

async function contact(page: Page) {
  await page.getByLabel("Name").fill("Test Seller");
  await page.getByLabel("Phone").fill("087 123 4567");
  await page.getByRole("checkbox").check();
}

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("a lower-case reg and a mileage with a comma send", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1, name: "Sell your car" })).toBeVisible();
  await page.getByLabel("Registration").fill("191-ky-1234");
  await page.getByLabel("Mileage").fill("120,500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your car." })).toBeFocused();
});

test("an empty reg is listed in the summary and the typed mileage stays", async ({ page }) => {
  await open(page);
  await page.getByLabel("Mileage").fill("120,500");
  await contact(page);
  await page.getByRole("button", { name: "Get my valuation" }).click();
  await expect(page.getByRole("heading", { name: "Check these details" })).toBeFocused();
  await page.getByRole("link", { name: "Enter the registration as shown on the car." }).click();
  await expect(page.getByLabel("Registration")).toBeFocused();
  await expect(page.getByLabel("Mileage")).toHaveValue("120,500");
});
