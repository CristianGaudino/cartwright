import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A tap before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("form")!).some((k) => k.startsWith("__reactFiber")));
}

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("a find-a-car request needs a message, then ends on the thanks", async ({ page }) => {
  await open(page, "/find-a-car");
  await expect(page.getByRole("heading", { level: 1, name: "Find a car" })).toBeVisible();
  await page.getByLabel("Name").fill("Test Buyer");
  await page.getByLabel("Phone").fill("087 123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Ask us to find it" }).click();

  await expect(page.getByRole("heading", { name: "Check these details" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Tell us what you are looking for." })).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Test Buyer");

  await page.getByLabel("Make").fill("Toyota");
  await page.getByLabel("Budget up to").selectOption({ label: "€20,000" });
  await page.getByLabel("What are you looking for?").fill("A small automatic, any colour.");
  await page.getByRole("button", { name: "Ask us to find it" }).click();

  const thanks = page.getByRole("heading", { name: "Thanks, we will look for it." });
  await expect(thanks).toBeFocused();
  await expect(page.getByRole("link", { name: "Back to used cars" })).toHaveAttribute("href", "/used-cars");
});

test("the find-a-car page has the call card and fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, "/find-a-car");
  await expect(page.getByRole("heading", { name: "Prefer to talk?" })).toBeVisible();
  await expect(page.locator("main a[href^='tel:']")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
