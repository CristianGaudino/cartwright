import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

type Demo = { slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());

// A tap before React attaches does nothing.
async function open(page: Page, slug: string) {
  await page.goto(`/used-cars/${slug}`);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Enquire" });
const enquire = (page: Page) => page.getByRole("button", { name: "Enquire", exact: true });

test("an enquiry from a car page ends on the thanks, and the next one starts empty", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("button", { name: "Close" })).toBeFocused();

  await d.getByLabel("Name").fill("Test Buyer");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();

  const thanks = d.getByRole("heading", { name: "Thanks, we have your enquiry." });
  await expect(thanks).toBeVisible();
  await expect(thanks).toBeFocused();

  await d.getByRole("button", { name: "Close" }).last().click();
  await expect(d).toBeHidden();
  await expect(enquire(page)).toBeFocused();
  await enquire(page).click();
  await expect(d.getByLabel("Name")).toHaveValue("");
  await expect(d.getByLabel("Email")).toHaveValue("");
  await expect(d.getByRole("checkbox")).not.toBeChecked();
});

test("closing the dialog keeps what was typed", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  await dialog(page).getByLabel("Name").fill("Half Typed");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await enquire(page).click();
  await expect(dialog(page).getByLabel("Name")).toHaveValue("Half Typed");
});

test("a sold car has no Enquire button", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");
  await page.goto(`/used-cars/${sold!.slug}`);
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await expect(enquire(page)).toHaveCount(0);
});
