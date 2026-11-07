import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";
import { stubTurnstile } from "./turnstile";

type Demo = { slug: string; make: string; model: string; variant?: string; priceEur: number; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const price = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// A keystroke before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const calc = (page: Page) => page.locator("[data-wells]");
const result = (page: Page) => calc(page).getByRole("status");

test("/finance works out a placeholder representative payment as the buyer types", async ({ page }) => {
  await open(page, "/finance");
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  await expect(page.getByText("Placeholder figures")).toBeVisible();
  await expect(page.getByText("Representative only. Not an offer of credit.")).toBeVisible();
  await expect(result(page)).toContainText(/€[\d,]+ a month/);

  // 12,000 borrowed over 48 months at 0% is exactly 250 a month.
  await calc(page).getByLabel("Price").fill("15000");
  await calc(page).getByLabel("Deposit").fill("3000");
  await calc(page).getByLabel("Term").selectOption("48");
  await calc(page).getByLabel("APR").fill("0");
  await expect(result(page)).toContainText("€250 a month");
  await expect(result(page)).toContainText("€12,000");
});

test("/finance shows what to fix, never NaN or a stale figure", async ({ page }) => {
  await open(page, "/finance");
  await calc(page).getByLabel("Price").fill("15000");
  await calc(page).getByLabel("Deposit").fill("15000");
  await expect(page.getByText("Deposit must be less than the price.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");

  await calc(page).getByLabel("Deposit").fill("3000");
  await calc(page).getByLabel("APR").fill("31");
  await expect(page.getByText("Enter an APR between 0 and 30.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");

  await calc(page).getByLabel("APR").fill("9.9");
  await calc(page).getByLabel("Price").fill("999");
  await expect(page.getByText("Enter a price between €1,000 and €250,000.")).toBeVisible();
  await expect(result(page)).toHaveText("Check the figures above.");
  expect(await page.locator("body").innerText()).not.toContain("NaN");
});

test("a sold car page has no Finance section", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");
  await page.goto(`/used-cars/${sold!.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finance", exact: true })).toHaveCount(0);
  await expect(calc(page)).toHaveCount(0);
});

test.describe("finance application", () => {
  // Runs only on the local server with fake backends: it must never send a lead to a deployed site.
  test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");
  test.beforeEach(async ({ page }) => stubTurnstile(page));

  test("Apply carries the deposit and term over, needs employment, asks nothing about money or identity", async ({ page }) => {
    await open(page, "/finance");
    await calc(page).getByLabel("Deposit").fill("4000");
    await calc(page).getByLabel("Term").selectOption("36");
    await page.getByRole("button", { name: "Apply for finance" }).click();

    const d = page.getByRole("dialog", { name: "Apply for finance" });
    await expect(d).toBeVisible();
    await expect(d.getByLabel("Deposit")).toHaveValue("4000");
    await expect(d.getByLabel("Term")).toHaveValue("36");
    await expect(d.getByText("We do not ask for income, date of birth or bank details.")).toBeVisible();
    await expect(d.getByLabel(/income|date of birth|bank/i)).toHaveCount(0);
    await expect(d.getByRole("img")).toHaveCount(0); // no car summary row from /finance

    await d.getByLabel("Name").fill("Test Buyer");
    await d.getByLabel("Phone").fill("087 123 4567");
    await d.getByRole("checkbox").check();
    await d.getByRole("button", { name: "Send finance application" }).click();
    await expect(d.getByRole("link", { name: "Choose an employment status." })).toBeVisible();

    await d.getByLabel("Employment status").selectOption({ label: "Self-employed" });
    await d.getByRole("button", { name: "Send finance application" }).click();
    await expect(d.getByRole("heading", { name: "Thanks, we have your application." })).toBeFocused();
  });

  test("a car page works out finance on that car's price and applies for that car", async ({ page }) => {
    await open(page, `/used-cars/${live.slug}`);
    await expect(page.getByRole("heading", { name: "Finance", exact: true })).toBeVisible();
    await expect(calc(page).getByText(price(live.priceEur), { exact: true })).toBeVisible();
    await expect(calc(page).getByLabel("Price")).toHaveCount(0); // text, not an input
    await expect(result(page)).toContainText(/€[\d,]+ a month/);

    const apply = page.getByRole("button", { name: "Apply for finance" });
    await expect(apply).not.toHaveClass(/bg-accent/); // Enquire keeps the page's one accent
    await apply.click();
    const d = page.getByRole("dialog", { name: "Apply for finance" });
    await expect(d).toBeVisible();
    await expect(d.getByText([live.make, live.model, live.variant].filter(Boolean).join(" "))).toBeVisible();
    await expect(d.getByText(price(live.priceEur))).toBeVisible();
  });
});
