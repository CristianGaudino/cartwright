import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { tomorrow } from "../src/lib/leads/constants";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";
import { stubTurnstile } from "./turnstile";

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

test.beforeEach(async ({ page }) => stubTurnstile(page));

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
  for (const name of ["Enquire", "Test drive", "Reserve"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
});

test("the bot check loads only once the dialog opens, and a failed check keeps what was typed", async ({ page }) => {
  await page.unrouteAll();
  await stubTurnstile(page, { pass: false });
  const calls: string[] = [];
  page.on("request", (r) => r.url().startsWith("https://challenges.cloudflare.com/") && calls.push(r.url()));
  await open(page, live.slug);
  expect(calls).toEqual([]);

  await enquire(page).click();
  const d = dialog(page);
  await expect.poll(() => calls.length).toBe(1);
  await d.getByLabel("Name").fill("Kept Name");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();
  await expect(d.getByRole("alert")).toContainText("We could not check this request.");
  await expect(d.getByLabel("Name")).toHaveValue("Kept Name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();
});

test("an empty send lists every problem, focuses the list and marks each field", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.getByRole("heading", { name: "Check these details" })).toBeFocused();
  for (const label of ["Name", "Phone", "Email"]) await expect(d.getByLabel(label)).toHaveAttribute("aria-invalid", "true");
  await expect(d.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  // The contact error shows once under Email, plus its link in the summary.
  await expect(d.locator("p", { hasText: "Add a phone number or an email." })).toHaveCount(1);

  await d.getByRole("link", { name: "Enter your name." }).click();
  await expect(d.getByLabel("Name")).toBeFocused();
});

test("a field error keeps what was typed, and consent is needed to send", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByLabel("Name").fill("Kept Name");
  await d.getByLabel("Email").fill("buyer@example.com");
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.getByRole("link", { name: "Tick the box to send your request." })).toBeVisible();
  await expect(d.locator("p", { hasText: "Tick the box to send your request." })).toBeVisible();
  await expect(d.getByRole("link", { name: "Enter your name." })).toHaveCount(0);
  await expect(d.getByLabel("Email")).toHaveValue("buyer@example.com");
  await expect(d.getByLabel("Name")).toHaveValue("Kept Name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();

  const privacy = d.getByRole("link", { name: /Privacy policy/ });
  await expect(privacy).toHaveAttribute("href", "/privacy");
  await expect(privacy).toHaveAttribute("target", "_blank");
});

test("Test drive and Reserve open the same dialog, and switching keeps what was typed", async ({ page }) => {
  await open(page, live.slug);
  await page.getByRole("button", { name: "Test drive", exact: true }).click();
  const d = page.getByRole("dialog");
  await expect(d).toHaveAccessibleName("Book a test drive");
  await expect(d.getByRole("radio", { name: "Test drive" })).toBeChecked();
  await expect(d.getByText("We will call to confirm a time.")).toBeVisible();

  await d.getByLabel("Name").fill("Switch Typer");
  await d.locator("label", { hasText: /^Reserve$/ }).click();
  await expect(d).toHaveAccessibleName("Request to reserve");
  await expect(d.getByRole("radio", { name: "Reserve" })).toBeChecked();
  await expect(d.getByLabel("Name")).toHaveValue("Switch Typer");
  await expect(d.getByText("This is a request, not a hold. We will call you to confirm. No payment is taken.")).toBeVisible();
  await expect(d.getByLabel("Preferred day")).toHaveCount(0);
  await expect(d.getByRole("button", { name: "Request to reserve" })).toBeVisible();
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the dialog is a centred 520px panel", async ({ page }) => {
    await open(page, live.slug);
    await enquire(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveCSS("opacity", "1"); // after the fade
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBe(520);
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
  });
});

test("the open dialog never scrolls sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the footer links the privacy page, which states the retention period", async ({ page }) => {
  await page.goto("/used-cars");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("12 months")).toBeVisible();
  await expect(page.getByRole("link", { name: "083 133 3154" })).toHaveAttribute("href", "tel:+353831333154");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a car page still offers Call now", async ({ page }) => {
    await page.goto(`/used-cars/${live.slug}`);
    await expect(page.getByRole("link", { name: "Call now" })).toHaveAttribute("href", /^tel:/);
  });
});

test("a test drive with a preferred day sends", async ({ page }) => {
  await open(page, live.slug);
  await page.getByRole("button", { name: "Test drive", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Book a test drive" });
  await d.getByLabel("Name").fill("Test Driver");
  await d.getByLabel("Phone").fill("087 123 4567");
  await d.getByLabel("Preferred day").fill(tomorrow());
  await d.getByLabel("Preferred time").selectOption("morning");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Request test drive" }).click();
  await expect(d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();
  await expect(d.getByText("We will call you to confirm a time for a test drive.")).toBeVisible();
});
