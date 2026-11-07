import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const TEL = "tel:+353831333154";
const main = (page: Page) => page.getByRole("main");
const fits320 = async (page: Page, path: string) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
};
// The pill is read before the h1.
const pillBeforeH1 = (page: Page) =>
  page.evaluate(() => {
    const pill = [...document.querySelectorAll("main span")].find((e) => e.textContent === "Placeholder details");
    const h1 = document.querySelector("main h1");
    return !!pill && !!h1 && !!(pill.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING);
  });

test("/service lists the services and offers Call to book", async ({ page }) => {
  await page.goto("/service");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Service");
  await expect(page.getByText("Placeholder details")).toBeVisible();
  expect(await pillBeforeH1(page)).toBe(true);
  for (const s of ["Servicing", "Repairs", "Tyres"]) await expect(main(page).getByRole("listitem").filter({ hasText: s })).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Call to book" })).toHaveAttribute("href", TEL);
});

test("/about links to the contact page", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About us");
  expect(await pillBeforeH1(page)).toBe(true);
  await expect(main(page).getByRole("link", { name: "Opening hours and directions" })).toHaveAttribute("href", "/contact");
});

test("/terms is a labelled draft with five sections and the dealer's phone", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of use");
  expect(await pillBeforeH1(page)).toBe(true);
  await expect(page.getByText("This is a draft. The dealer's own terms replace it.")).toBeVisible();
  await expect(main(page).getByRole("heading", { level: 2 })).toHaveText(["Using this site", "Cars and prices", "Finance figures", "Reviews", "Contact"]);
  await expect(main(page).getByRole("link", { name: "083 133 3154" })).toHaveAttribute("href", TEL);
});

test("/privacy keeps its copy on the shared frame, with no pill", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
  await expect(page.getByText("We keep each request for 12 months")).toBeVisible();
  await expect(page.getByText("Placeholder details")).toHaveCount(0);
});

for (const path of ["/service", "/about", "/terms", "/privacy"]) {
  test(`${path} fits 320px with no sideways scroll`, async ({ page }) => {
    await fits320(page, path);
  });
}
