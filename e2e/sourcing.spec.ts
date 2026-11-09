import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

// A tap before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("a find-a-car request needs a message, then ends on the thanks", async ({ page }) => {
  await open(page, "/find-a-car");
  await expect(page.getByRole("heading", { level: 1, name: "Find a car" })).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible();
  // One of make, model or type is needed before Next.
  await next.click();
  await expect(page.getByText("Add a make, a model or a type of car.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Step 1 of 4/ })).toBeVisible();
  await page.getByLabel("Make").fill("Toyota");
  const budget = page.getByRole("slider", { name: "Budget" });
  await budget.fill("20000");
  await budget.blur();
  await next.click();

  // The message is the one thing needed: Next refuses without it and keeps what was typed.
  await expect(page.getByRole("heading", { name: /^Step 2 of 4/ })).toBeVisible();
  await next.click();
  await expect(page.getByRole("alert").filter({ hasText: "attention" })).toContainText("One field needs attention.");
  await expect(page.locator("p", { hasText: "Tell us what you're looking for." })).toBeVisible();
  await page.getByLabel("What are you looking for?").fill("A small automatic, any colour.");
  await next.click();

  // Photos of cars you like are optional.
  await expect(page.getByRole("heading", { name: /^Step 3 of 4/ })).toBeVisible();
  await next.click();
  await page.getByLabel("Name").fill("Test Buyer");
  await page.getByLabel("Phone").fill("087 123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Ask us to find it" }).click();

  const thanks = page.getByRole("heading", { name: "Thanks, we'll look for it." });
  await expect(thanks).toBeFocused();
  await expect(page.getByRole("link", { name: "Back to used cars" })).toHaveAttribute("href", "/used-cars");
});

test("from 1024px the header links both form pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/used-cars");
  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Trade-In", exact: true }).click();
  await expect(page).toHaveURL(/\/trade-in$/);
  await header.getByRole("button", { name: "Stock" }).click();
  await header.getByRole("link", { name: "Find a car" }).click();
  await expect(page).toHaveURL(/\/find-a-car$/);
});

test("on a phone the form pages are in the footer, not the header, and the header fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/used-cars");
  for (const [name, href] of [
    ["Trade-In Valuation", "/trade-in"],
    ["Find a car", "/find-a-car"],
  ]) {
    await expect(page.getByRole("banner").getByRole("link", { name, exact: true })).toBeHidden();
    await expect(page.getByRole("contentinfo").getByRole("link", { name })).toHaveAttribute("href", href);
  }
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the find-a-car page explains how it works and fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, "/find-a-car");
  await expect(page.getByRole("heading", { name: "Find a Car", level: 1 })).toBeVisible();
  await expect(page.getByText("We Look for It")).toBeVisible();
  await expect(page.getByText("Prefer to talk?")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

for (const [path, heading] of [
  ["/contact", "Contact"],
  ["/service", "Service"],
] as const) {
  test(`${path}: a message needs the message text, then ends on the thanks`, async ({ page }) => {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    if (path === "/service") {
      // The form is closed until a service is opened; it opens beside the checks with a line already in it.
      await expect(page.getByLabel("Name")).toHaveCount(0);
      await page.getByRole("button", { name: /^Servicing/ }).click();
      await expect(page.getByLabel("How can we help?")).toHaveValue("I'd like to ask about servicing.");
      await page.getByLabel("How can we help?").fill("");
    }
    await page.getByLabel("Name").fill("Test Buyer");
    await page.getByLabel("Phone").fill("087 123 4567");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("p", { hasText: "Tell us how we can help." })).toBeVisible();
    await page.getByLabel("How can we help?").fill("Do you service Fords?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeFocused();
  });
}

test("after a general message the button goes home, not to the stock list", async ({ page }) => {
  await open(page, "/contact");
  await page.getByLabel("How can we help?").fill("Hello");
  await page.getByLabel("Phone").fill("087 123 4567");
  await page.getByLabel("Name").fill("Test Buyer");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
});
