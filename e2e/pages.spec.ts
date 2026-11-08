import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const TEL = "tel:+353831333154";
const main = (page: Page) => page.getByRole("main");
const fits320 = async (page: Page, path: string) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
};

test("/service has a call button with the number, WhatsApp, services that open, and no lone number", async ({ page }) => {
  await page.goto("/service");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Service");
  await expect(page.getByText("Placeholder details")).toHaveCount(0);
  await expect(main(page).getByRole("link", { name: "Call +353 83 133 3154" })).toHaveAttribute("href", TEL);
  await expect(main(page).getByRole("link", { name: /^WhatsApp/ })).toHaveAttribute("href", "https://wa.me/353831333154");
  await expect(main(page).locator("p", { hasText: /^\+353 83 133 3154$/ })).toHaveCount(0); // the number is on the button, not under it
  for (const s of ["Servicing", "Repairs", "Tyres"]) await expect(main(page).getByRole("button", { name: new RegExp(`^${s}`) })).toHaveAttribute("aria-expanded", "false");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await main(page).getByRole("button", { name: /^Tyres/ }).click();
  await expect(main(page).getByRole("heading", { name: "Tyres: What We Do" })).toBeVisible();
  await expect(main(page).getByText("Puncture repair")).toBeVisible();
  await expect(main(page).getByLabel("Name")).toBeVisible(); // the form is open beside the checks
});

test("/about has the photo on the right on desktop with the hours and directions under it, and no Visit us", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Us");
  await expect(main(page).getByRole("heading", { name: "Visit us" })).toHaveCount(0);
  await expect(main(page).getByRole("heading", { name: "Who we are" })).toHaveCount(0);
  await expect(main(page).getByRole("heading", { name: "Why Choose Us" })).toBeVisible();
  const photo = (await main(page).locator("img").first().boundingBox())!;
  const why = (await main(page).getByRole("heading", { name: "Why Choose Us" }).boundingBox())!;
  expect(photo.x).toBeGreaterThan(why.x + 300); // the photo is in the right-hand column
  const hours = (await main(page).getByRole("heading", { name: "Opening Hours" }).boundingBox())!;
  expect(hours.y).toBeGreaterThan(photo.y + photo.height); // hours under the photo
  await expect(main(page).getByRole("link", { name: /Get directions/i })).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\//);
});

test("/terms is a labelled draft with five sections and the dealer's phone", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of Use");
  await expect(page.getByText("This is a draft. The dealer's own terms replace it.")).toBeVisible();
  await expect(main(page).getByRole("heading", { level: 2 })).toHaveText(["Using this site", "Cars and prices", "Finance figures", "Reviews", "Contact"]);
  await expect(main(page).getByRole("link", { name: "+353 83 133 3154" })).toHaveAttribute("href", TEL);
});

test("/privacy keeps its copy on the shared frame, with no pill", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
  await expect(page.getByText("We keep each request for 12 months")).toBeVisible();
  await expect(page.getByText("Placeholder details")).toHaveCount(0);
});

test("/contact gives the phone, WhatsApp, the hours under the map, and no address block", async ({ page }) => {
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact");
  await expect(main(page).getByRole("link", { name: "Call +353 83 133 3154" })).toHaveAttribute("href", TEL);
  await expect(main(page).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/353831333154");
  await expect(main(page).locator("address")).toHaveCount(0); // the address is in the footer
  await expect(main(page).getByRole("heading", { name: "Address" })).toHaveCount(0);
  const rows = main(page).locator("dl > div");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Monday to Friday");
  await expect(rows.first()).toContainText("9:30am to 6pm");
  await expect(rows.nth(1)).toContainText("Saturday");
  await expect(rows.last()).toContainText("Closed");
  await expect(main(page).getByRole("link", { name: "Ask us to find a car" })).toHaveCount(0); // the footer has those
  await expect(main(page).getByRole("link", { name: "Trade-In Valuation" })).toHaveCount(0);
  await expect(main(page).getByRole("link", { name: /^WhatsApp/ }).locator("svg")).toHaveCSS("color", "rgb(37, 211, 102)"); // WhatsApp's green
});

test("/contact shows the map at once, level with the form, with the hours under it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.goto("/contact");
  const map = page.locator('iframe[title="Map of Carright, Tralee"]');
  await expect(map).toBeVisible();
  await expect(page.getByRole("button", { name: "Show map" })).toHaveCount(0);
  const call = (await main(page).getByRole("link", { name: /^Call / }).boundingBox())!;
  const frame = (await map.boundingBox())!;
  expect(Math.abs(call.y - frame.y)).toBeLessThan(40); // the two columns start together
  const hours = (await main(page).getByRole("heading", { name: "Opening Hours" }).boundingBox())!;
  expect(hours.y).toBeGreaterThan(frame.y + frame.height); // under the map
  expect(hours.x).toBeGreaterThan(640); // in the map's column
});

test("/contact carries AutoDealer JSON-LD with no placeholder or demo facts", async ({ page }) => {
  await page.goto("/contact");
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const data = JSON.parse((await scripts.textContent())!);
  expect(data["@type"]).toBe("AutoDealer");
  expect(data.telephone).toBe("+353831333154");
  expect(data).not.toHaveProperty("aggregateRating");
  expect(data).not.toHaveProperty("openingHoursSpecification");
  expect(data.address).not.toHaveProperty("streetAddress");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/contact still offers directions and the map", async ({ page }) => {
    await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, body: "" }));
    await page.goto("/contact");
    await expect(page.locator("iframe")).toHaveCount(1);
  });
});

for (const path of ["/service", "/warranty", "/about", "/terms", "/privacy", "/contact"]) {
  test(`${path} fits 320px with no sideways scroll`, async ({ page }) => {
    await fits320(page, path);
  });
}

// Every page can be shared and found: its own description, a canonical address and a share image (a car has its own photo).
for (const path of ["/", "/used-cars", "/finance", "/trade-in", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/privacy", "/terms"]) {
  test(`${path}: a description of its own, a canonical link and a share image`, async ({ page }) => {
    await page.goto(path);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc!.length).toBeGreaterThan(40);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Carright");
  });
}

test("no two of the main pages share a description", async ({ page }) => {
  const seen = new Set<string>();
  for (const path of ["/", "/used-cars", "/finance", "/trade-in", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/privacy", "/terms"]) {
    await page.goto(path);
    const desc = (await page.locator('meta[name="description"]').getAttribute("content"))!;
    expect(seen.has(desc), `${path}: ${desc}`).toBe(false);
    seen.add(desc);
  }
});
