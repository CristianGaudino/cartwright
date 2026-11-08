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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Us");
  expect(await pillBeforeH1(page)).toBe(true);
  await expect(main(page).getByRole("link", { name: "Opening Hours and Directions" })).toHaveAttribute("href", "/contact");
});

test("/terms is a labelled draft with five sections and the dealer's phone", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of Use");
  expect(await pillBeforeH1(page)).toBe(true);
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

test("/contact gives the phone, address, hours and links, and loads nothing from Google", async ({ page }) => {
  const google: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("google.")) google.push(r.url());
  });
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact");
  expect(await pillBeforeH1(page)).toBe(true);
  await expect(main(page).getByRole("link", { name: "Call +353 83 133 3154" })).toHaveAttribute("href", TEL);
  await expect(main(page).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/353831333154");
  await expect(main(page).locator("address")).toContainText("Ballymac, Maglass");
  const rows = main(page).locator("dl > div");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Monday to Friday");
  await expect(rows.first()).toContainText("9:30am to 6pm");
  await expect(rows.nth(1)).toContainText("Saturday");
  await expect(rows.last()).toContainText("Closed");
  await expect(main(page).getByRole("link", { name: "Ask us to find a car" })).toHaveAttribute("href", "/find-a-car");
  await expect(main(page).getByRole("link", { name: "Sell your car" })).toHaveAttribute("href", "/sell-your-car");
  const directions = main(page).getByRole("link", { name: /Get directions/ });
  await expect(directions).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  expect(await directions.getAttribute("href")).toContain("V92%20NT93");
  expect(google).toEqual([]);
});

test("/contact shows the map only once asked", async ({ page }) => {
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.goto("/contact");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Show map" }).click();
  await expect(page.locator('iframe[title="Map of Carright, Tralee"]')).toBeVisible();
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

  test("/contact still offers directions, and no iframe", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: /Get directions/ })).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\//);
    await expect(page.locator("iframe")).toHaveCount(0);
  });
});

for (const path of ["/service", "/warranty", "/about", "/terms", "/privacy", "/contact"]) {
  test(`${path} fits 320px with no sideways scroll`, async ({ page }) => {
    await fits320(page, path);
  });
}

// Every page can be shared and found: its own description, a canonical address and a share image (a car has its own photo).
for (const path of ["/", "/used-cars", "/finance", "/sell-your-car", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/privacy", "/terms"]) {
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
  for (const path of ["/", "/used-cars", "/finance", "/sell-your-car", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/privacy", "/terms"]) {
    await page.goto(path);
    const desc = (await page.locator('meta[name="description"]').getAttribute("content"))!;
    expect(seen.has(desc), `${path}: ${desc}`).toBe(false);
    seen.add(desc);
  }
});
