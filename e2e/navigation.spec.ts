import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Demo = { slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;

// The header links from 1024px, then the phone menu (which adds Used cars and Find a car), then the footer.
const HEADER = [
  ["Finance", "/finance"],
  ["Trade-In", "/trade-in"],
  ["Service", "/service"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;
const MENU = [["Used Cars", "/used-cars"], HEADER[0], HEADER[1], ["Find a Car", "/find-a-car"], ["Compare Cars", "/compare"], ...HEADER.slice(2)] as const;
const FOOTER = [
  ["Used Cars", "/used-cars"],
  ["Finance", "/finance"],
  ["Trade-In Valuation", "/trade-in"],
  ["Find a Car", "/find-a-car"],
  ["Service", "/service"],
  ["Warranty", "/warranty"],
  ["About Us", "/about"],
  ["Contact", "/contact"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Use", "/terms"],
  ["Opening Hours and Directions", "/contact"],
] as const;
const PAGES = ["/", "/used-cars", `/used-cars/${live.slug}`, "/finance", "/trade-in", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/terms", "/privacy"];

test("from 1024px the header has Stock and five links, and no Enquire button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  for (const [name, href] of HEADER) await expect(banner.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  await expect(banner.getByRole("link", { name: "Enquire" })).toHaveCount(0);
  const stock = banner.getByRole("button", { name: "Stock" });
  await expect(stock).toHaveAttribute("aria-expanded", "false");
  await stock.click();
  await expect(stock).toHaveAttribute("aria-expanded", "true");
  for (const [name, href] of [["All Used Cars", "/used-cars"], ["Find a Car", "/find-a-car"], ["Compare Cars", "/compare"]]) await expect(banner.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  await page.keyboard.press("Escape");
  await expect(stock).toHaveAttribute("aria-expanded", "false");
});

test("the current section has a red bar and aria-current", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/finance");
  await expect(page.getByRole("banner").getByRole("link", { name: "Finance", exact: true })).toHaveAttribute("aria-current", "page");
});

test("at 320px the header holds the menu button, and the footer reaches every page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("button", { name: "Menu" })).toBeVisible();
  for (const [name] of HEADER) await expect(banner.getByRole("link", { name, exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const footer = page.getByRole("contentinfo");
  for (const [name, href] of FOOTER) await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  await expect(footer.getByRole("link", { name: "+353 83 133 3154" })).toHaveAttribute("href", "tel:+353831333154");
  await expect(footer.getByText("© Carright")).toBeVisible();
});

test("the footer has social icons and a Powered by Checkwork link that opens checkwork.ie", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const name of ["Facebook", "Instagram", "TikTok"]) {
    const l = footer.getByRole("link", { name: new RegExp(`^${name}`) });
    await expect(l).toHaveAttribute("href", new RegExp(`^https://www\\.${name.toLowerCase()}\\.com/`));
    await expect(l).toHaveAttribute("target", "_blank");
  }
  const credit = footer.getByRole("link", { name: /Checkwork/ });
  await expect(credit).toHaveAttribute("href", "https://www.checkwork.ie");
  await expect(credit).toContainText("Powered by");
  await expect(credit.getByRole("img", { name: "Checkwork" })).toBeVisible();
});

test("from 360px the header also shows Used cars, and it still fits", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Used Cars" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test.describe("the mobile menu", () => {
  const open = async (page: import("@playwright/test").Page) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    return page.getByRole("dialog", { name: "Menu" });
  };

  test("opens with every page and a Call now button, in 44px or taller targets", async ({ page }) => {
    const menu = await open(page);
    await expect(menu).toBeVisible();
    for (const [name, href] of MENU) {
      const link = menu.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(menu.getByRole("link", { name: "Call Us" })).toHaveAttribute("href", "tel:+353831333154");
  });

  test("a link takes you there and closes the menu; Escape and Close menu close it and return focus", async ({ page }) => {
    let menu = await open(page);
    await menu.getByRole("link", { name: "Finance", exact: true }).click();
    await expect(page).toHaveURL(/\/finance$/);
    await expect(menu).toBeHidden();

    menu = await open(page);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    const button = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await expect(button).toBeFocused();

    await button.click();
    await menu.getByRole("button", { name: "Close menu" }).click();
    await expect(menu).toBeHidden();
  });

  test("the button is gone from 1024px and an open menu closes when the screen widens", async ({ page }) => {
    const menu = await open(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(menu).toBeHidden();
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
  });
});

test("every footer route answers 200", async ({ request }) => {
  for (const href of new Set(FOOTER.map(([, h]) => h))) expect((await request.get(href)).status(), href).toBe(200);
});

for (const path of PAGES) {
  test(`${path}: one header, main, footer and h1, no dead links, fits 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.locator('a[href="#"], a[href=""]').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}
