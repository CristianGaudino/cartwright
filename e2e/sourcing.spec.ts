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

test("from 1024px the header links both form pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/used-cars");
  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Sell your car" }).click();
  await expect(page).toHaveURL(/\/sell-your-car$/);
  await header.getByRole("link", { name: "Find a car" }).click();
  await expect(page).toHaveURL(/\/find-a-car$/);
});

test("on a phone the form pages are in the footer, not the header, and the header fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/used-cars");
  for (const [name, href] of [
    ["Sell your car", "/sell-your-car"],
    ["Find a car", "/find-a-car"],
  ]) {
    await expect(page.getByRole("banner").getByRole("link", { name })).toBeHidden();
    await expect(page.getByRole("contentinfo").getByRole("link", { name })).toHaveAttribute("href", href);
  }
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the find-a-car page has the call card and fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, "/find-a-car");
  await expect(page.getByRole("heading", { name: "Prefer to talk?" })).toBeVisible();
  await expect(page.locator("main a[href^='tel:']")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

for (const [path, heading] of [
  ["/contact", "Contact"],
  ["/service", "Service"],
] as const) {
  test(`${path}: a message needs the message text, then ends on the thanks`, async ({ page }) => {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.getByLabel("Name").fill("Test Buyer");
    await page.getByLabel("Phone").fill("087 123 4567");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("link", { name: "Tell us how we can help." })).toBeVisible();
    await page.getByLabel("How can we help?").fill("Do you service Fords?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeFocused();
  });
}
