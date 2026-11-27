import { readFileSync } from "node:fs";
import { join } from "node:path";
import { choose, optionLabels } from "./combo";
import { expect, test } from "@playwright/test";
import { DEALER_ADDRESS, SITE_NAME } from "../src/lib/site";

type Demo = { id: string; slug: string; make: string; model: string; modelSlug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const inStock = cars.filter((c) => !c.soldAt).sort((a, b) => Number(b.id) - Number(a.id));
const newest = inStock[0];

test("title, one h1 and a search that lands on used cars", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(`${SITE_NAME} | Used cars in ${DEALER_ADDRESS.town}`);
  await expect(page.getByRole("heading", { level: 1, name: "Find your next car" })).toHaveCount(1);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await choose(page.getByLabel("Make", { exact: true }), newest.make);
  await page.getByRole("button", { name: "Search cars" }).click();
  await expect(page).toHaveURL(/\/used-cars\?/);
  expect(new URL(page.url()).searchParams.get("make")).toBe(newest.make.toLowerCase().replaceAll(" ", "-"));
});

test("picking a make narrows the model list, and the Find me a car tab links to the form page", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const model = page.getByLabel("Model", { exact: true });
  const all = (await optionLabels(model)).length;
  await choose(page.getByLabel("Make", { exact: true }), newest.make);
  expect((await optionLabels(model)).length).toBeLessThan(all);
  await page.getByRole("tab", { name: "Find me a car" }).click();
  await expect(page.getByRole("link", { name: "Ask us to find it" })).toHaveAttribute("href", "/find-a-car");
  await expect(page.getByLabel("Make", { exact: true })).toBeHidden();
});

test("the Find me a car tab fits inside the Search Stock box and the page does not move between them", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const box = page.getByRole("tablist").locator("xpath=..");
  const before = (await box.boundingBox())!;
  await page.getByRole("tab", { name: "Find me a car" }).click();
  const panel = page.getByRole("tabpanel", { name: "Find Me a Car" });
  await expect(panel).toBeVisible();
  const after = (await box.boundingBox())!;
  expect(after.height).toBe(before.height);
  const p = (await panel.boundingBox())!;
  for (const part of [panel.getByRole("link", { name: "Ask us to find it" }), panel.getByText("Can't see the car you want?")]) {
    const b = (await part.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(p.y);
    expect(b.y + b.height).toBeLessThanOrEqual(p.y + p.height);
  }
});

test("on a phone the featured row has no count, arrows or dots", async ({ page }) => {
  await page.goto("/");
  const row = page.getByRole("group", { name: "Featured stock" });
  const cards = await row.locator("article").count();
  expect(cards).toBeGreaterThan(4); // more dots than a phone has room for (the controls would shrink): a count instead
  await expect(row.getByText(`1 / ${cards}`)).toBeHidden(); // no count, arrows or dots on a phone: the row is swiped
  await expect(row.getByRole("button", { name: /^(Previous|Next) cars$/ })).toBeHidden();
});

// Typing into a drop-down is for a mouse and keyboard: a phone only picks (no keyboard rises over the list).
const desktop = async (browser: import("@playwright/test").Browser, baseURL: string | undefined) =>
  (await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })).newPage();

test("on a phone the drop-downs only pick: the field cannot be typed into", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await expect(page.getByLabel("Make", { exact: true })).toHaveAttribute("readonly", "");
});

test("the drop-downs are the site's own: typing narrows the list, Enter picks, Escape puts it back", async ({ browser, baseURL }) => {
  const page = await desktop(browser, baseURL);
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  expect(await page.locator("select").count()).toBe(0); // no browser drop-downs left
  const make = page.getByLabel("Make", { exact: true });
  await make.click();
  const options = page.getByRole("listbox").getByRole("option");
  const total = await options.count();
  await make.fill(newest.make.slice(0, 3).toLowerCase());
  expect(await options.count()).toBeLessThan(total);
  await expect(options.first()).toContainText(newest.make.slice(0, 3), { ignoreCase: true });
  await make.press("Enter");
  await expect(make).toHaveValue(newest.make);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await make.click();
  await make.fill("zzzz");
  await expect(page.getByText("No match")).toBeVisible();
  await make.press("Escape");
  await expect(make).toHaveValue(newest.make); // what was typed is dropped, the pick stays
});

test("the drop-downs work from the keyboard: arrows move, Home and End jump, Enter picks, leaving closes", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const make = page.getByLabel("Make", { exact: true });
  await make.focus();
  await make.press("ArrowDown"); // opens on the chosen option, "Any make"
  const options = page.getByRole("listbox").getByRole("option");
  await expect(make).toHaveAttribute("aria-expanded", "true");
  await make.press("ArrowDown");
  await make.press("ArrowDown");
  const third = (await options.nth(2).textContent())!.trim();
  await expect(make).toHaveAttribute("aria-activedescendant", /-opt-2$/);
  await make.press("End");
  await expect(make).toHaveAttribute("aria-activedescendant", new RegExp(`-opt-${(await options.count()) - 1}$`));
  await make.press("Home");
  await expect(make).toHaveAttribute("aria-activedescendant", /-opt-0$/);
  await make.press("ArrowDown");
  await make.press("ArrowDown");
  await make.press("Enter");
  await expect(make).toHaveValue(third);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await make.press("ArrowDown");
  await expect(page.getByRole("listbox")).toHaveCount(1);
  await page.getByLabel("Model", { exact: true }).focus(); // focus leaves: the list closes
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(make).toHaveValue(third);
});

test("typing into a drop-down reached by keyboard opens its list right under the field", async ({ browser, baseURL }) => {
  const page = await desktop(browser, baseURL);
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  const make = page.getByLabel("Make", { exact: true });
  await make.focus(); // as Tab would: no click, no arrow key
  await page.keyboard.type(newest.make.slice(0, 2));
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const [field, box] = [(await make.boundingBox())!, (await list.boundingBox())!];
  expect(Math.abs(box.x - field.x)).toBeLessThan(2);
  expect(box.y > field.y + field.height - 2 || box.y + box.height < field.y + 2).toBe(true); // just below it, or just above
  expect(Math.min(Math.abs(box.y - (field.y + field.height)), Math.abs(field.y - (box.y + box.height)))).toBeLessThan(12);
});

test("every model the search offers has a car in stock", async ({ page }) => {
  await page.goto("/");
  const offered = (await optionLabels(page.getByLabel("Model", { exact: true }))).filter((l) => l !== "Any model");
  const liveModels = new Set(inStock.map((c) => c.model));
  expect(offered.length).toBeGreaterThan(0);
  for (const model of offered) expect(liveModels.has(model), model).toBe(true);
});

test("the search offers only makes that have a car in stock", async ({ page }) => {
  await page.goto("/");
  const offered = (await optionLabels(page.getByLabel("Make", { exact: true }))).filter((l) => l !== "Any make");
  const inStockMakes = new Set(inStock.map((c) => c.make));
  expect(offered.length).toBeGreaterThan(0);
  for (const make of offered) expect(inStockMakes.has(make), make).toBe(true);
});

test("featured stock: the newest in-stock cars and View all stock", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Featured stock" }) });
  const cards = section.locator("article");
  await expect(cards).toHaveCount(Math.min(6, inStock.length));
  await expect(cards.first().locator("a").first()).toHaveAttribute("href", `/used-cars/${newest.slug}`);
  await expect(section.getByRole("link", { name: "View all stock" })).toHaveAttribute("href", "/used-cars");
});

test.describe("desktop pointer", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("the featured row pages with its arrows, and the trust icons are all the same size", async ({ page }) => {
    await page.goto("/");
    const row = page.getByRole("group", { name: "Featured stock" });
    const next = row.getByRole("button", { name: "Next cars" });
    await expect(next).toBeVisible();
    await expect(row.getByRole("button", { name: "Previous cars" })).toHaveCSS("opacity", "0.3");
    // The arrows sit under the row, beside the dots, not over the cards; a dot is a button that goes to its page.
    const rowBox = (await row.locator(":scope > ul").boundingBox())!;
    expect((await next.boundingBox())!.y).toBeGreaterThan(rowBox.y + rowBox.height - 4);
    await next.click();
    await expect(row.getByRole("button", { name: "Previous cars" })).toHaveCSS("opacity", "1");
    await expect(row.getByRole("button", { name: /^Go to page 2 of/ })).toHaveAttribute("aria-current", "true");
    await row.getByRole("button", { name: /^Go to page 1 of/ }).click();
    await expect(row.getByRole("button", { name: /^Go to page 1 of/ })).toHaveAttribute("aria-current", "true");
    for (const icon of await page.getByRole("region", { name: "Why buy from us" }).locator("svg").all()) {
      const box = (await icon.boundingBox())!;
      expect([box.width, box.height]).toEqual([24, 24]);
    }
  });
});

for (const width of [900, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: false, hasTouch: false });

    test("Next on the featured row reaches its last card", async ({ page }) => {
      await page.goto("/");
      await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
      const row = page.getByRole("group", { name: "Featured stock" });
      await row.scrollIntoViewIfNeeded();
      const next = row.getByRole("button", { name: "Next cars" });
      const pages = await row.getByRole("button", { name: /^Go to page / }).count();
      for (let i = 1; i < pages; i++) {
        await next.click();
        await expect(row.getByRole("button", { name: `Go to page ${i + 1} of ${pages}` })).toHaveAttribute("aria-current", "true");
      }
      await expect(row.locator("article").last()).toBeInViewport({ ratio: 1 });
      await expect(next).toHaveCSS("opacity", "0.3");
    });
  });
}

// Tailwind's active:scale-* sets the scale property; a transition that only lists transform makes the press snap (#45).
test("press feedback eases scale, and header links are 44px tall", async ({ page }) => {
  await page.goto("/");
  for (const el of [page.getByRole("button", { name: "Search cars" }), page.getByRole("main").getByRole("link", { name: "Browse our stock" })]) {
    await expect(el).toHaveCSS("transition-property", /\bscale\b/);
  }
  // A card never scales on press: on iOS that cancelled the photo swipe inside it (#44). Its body lightens instead.
  await expect(page.locator("article[data-card]").first()).toHaveCSS("scale", "none");
  expect(await page.locator("article[data-card][class*='active:scale']").count()).toBe(0);
  for (const link of await page.getByRole("navigation", { name: "Main" }).getByRole("link").filter({ visible: true }).all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("reviews, the trust strip and finance banner, and AutoDealer JSON-LD", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What customers say" })).toBeVisible();
  const main = page.getByRole("main");
  for (const [name, href] of [
    [/^3 Month Warranty/, "/warranty"],
    [/^Extended Warranty/, "/warranty"],
    [/^Flexible Finance/, "/finance"],
    [/^Trade-In Welcome/, "/trade-in"],
    [/^Test Drives/, "/used-cars"],
    ["Check finance options", "/finance"],
    ["Estimate your finance", "/finance"],
  ] as const) {
    await expect(main.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const data = JSON.parse((await scripts.textContent())!);
  expect(data["@type"]).toBe("AutoDealer");
  expect(data).not.toHaveProperty("aggregateRating");
});

test("the hero uses the dealer's photo, and the header logo is the vector one", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("section.hero-photo")).toHaveCSS("background-image", /\/brand\/hero(-sm)?\.webp/);
  await expect(page.getByRole("banner").getByRole("img", { name: SITE_NAME })).toHaveAttribute("src", "/brand/logo.svg");
  for (const path of ["/brand/hero.webp", "/brand/hero-sm.webp", "/brand/about.webp", "/brand/logo.svg"]) expect((await request.get(path)).status(), path).toBe(200);
});

test("every item in the trust strip is a link with the same padding, so the row lines up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const links = page.getByRole("region", { name: "Why buy from us" }).getByRole("link");
  await expect(links).toHaveCount(5);
  const boxes = await Promise.all((await links.all()).map((l) => l.boundingBox()));
  expect(new Set(boxes.map((b) => Math.round(b!.y))).size).toBe(1);
  expect(new Set(boxes.map((b) => Math.round(b!.height))).size).toBe(1);
});

test("at 320px nothing scrolls sideways and the search selects sit two to a row", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const make = await page.getByLabel("Make", { exact: true }).boundingBox();
  const model = await page.getByLabel("Model", { exact: true }).boundingBox();
  expect(make!.y).toBe(model!.y);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the search still lands on used cars", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search cars" }).click();
    await expect(page).toHaveURL(/\/used-cars/); // the drop-downs need scripts to pick from; the search still goes to the stock
  });
});

// Every animate() on a card of a row is the nudge: kept per row, with its length, so a test can count them.
const recordNudges = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __nudges: { row: string; ms: number }[] };
    w.__nudges = [];
    const real = Element.prototype.animate;
    Element.prototype.animate = function (keys, options) {
      const a = real.call(this, keys, options);
      const row = this.parentElement?.parentElement;
      if (this.tagName === "LI" && row?.getAttribute("aria-roledescription") === "carousel")
        w.__nudges.push({ row: row.getAttribute("aria-label")!, ms: Number(a.effect!.getTiming().duration) });
      return a;
    };
  });
const nudges = (page: import("@playwright/test").Page, row: string) =>
  page.evaluate((r) => (window as unknown as { __nudges: { row: string; ms: number }[] }).__nudges.filter((n) => n.row === r), row);
// Animations running on the row's own cards (not the photo fades inside them).
const moving = (row: import("@playwright/test").Locator) =>
  row.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => (a.effect as KeyframeEffect | null)?.target?.parentElement === el).length);
const hydrated = (page: import("@playwright/test").Page) =>
  page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));

for (const width of [360, 412, 900, 1280]) {
  test(`no row has a Pause or Play button at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await hydrated(page);
    await expect(page.getByRole("group", { name: "Featured stock" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Pause|Play) / })).toHaveCount(0);
  });
}

test("on a phone a row takes no room below its cards: no controls row and no gap", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await hydrated(page);
  for (const name of ["Featured stock", "Google reviews"]) {
    const group = page.getByRole("group", { name });
    const [box, row] = [(await group.boundingBox())!, (await group.locator(":scope > ul").boundingBox())!];
    expect(Math.abs(box.height - row.height)).toBeLessThan(1);
  }
});

for (const width of [360, 430]) {
  test(`at ${width}px the next card peeks in, so the row plainly scrolls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    for (const name of ["Featured stock", "Google reviews"]) {
      const second = (await page.getByRole("group", { name }).locator(":scope > ul > li").nth(1).boundingBox())!;
      expect(width - second.x).toBeGreaterThan(24); // a good part of the next card shows
      expect(second.x).toBeGreaterThan(width / 2); // but the first card is the one being read
    }
  });
}

test("a row nudges once when it first comes into view, back to its start, and never moves the page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await recordNudges(page);
  await page.goto("/");
  await hydrated(page);
  const row = page.getByRole("group", { name: "Google reviews" }).locator(":scope > ul");
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const y = await page.evaluate(() => window.scrollY);
  await expect.poll(() => nudges(page, "Google Reviews").then((n) => n.length)).toBeGreaterThan(0);
  const first = await nudges(page, "Google Reviews");
  expect(first).toHaveLength(await row.locator(":scope > li").count()); // the cards move together, once
  for (const n of first) expect(n.ms).toBeLessThan(1500); // short enough that WCAG 2.2.2 asks for no Pause
  await expect.poll(() => moving(row)).toBe(0);
  expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);
  expect(await row.locator(":scope > li").evaluateAll((lis) => lis.map((li) => getComputedStyle(li).translate))).toEqual(first.map(() => "none"));
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  // Away and back again: no second nudge.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);
  expect(await nudges(page, "Google Reviews")).toHaveLength(first.length);
});

test("with reduced motion no row nudges", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordNudges(page);
  await page.goto("/");
  await hydrated(page);
  for (const name of ["Featured stock", "Google reviews"]) {
    await page.getByRole("group", { name }).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
  }
  expect(await page.evaluate(() => (window as unknown as { __nudges: unknown[] }).__nudges)).toHaveLength(0);
});

test("a touch on a row stops the nudge at once, with the cards back in place", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await hydrated(page);
  const row = page.getByRole("group", { name: "Google reviews" }).locator(":scope > ul");
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect.poll(() => moving(row), { intervals: [20] }).toBeGreaterThan(0);
  const card = (await row.locator("article").first().boundingBox())!;
  await page.touchscreen.tap(card.x + card.width / 2, card.y + 12);
  expect(await moving(row)).toBe(0);
  expect(await row.locator(":scope > li").first().evaluate((li) => getComputedStyle(li).translate)).toBe("none");
});

test("scrolling a row does not read its sizes on every scroll event", async ({ page }) => {
  // Counts getComputedStyle calls on a row: sizes are read when the row is resized, never per scroll, which fires every frame of a swipe.
  await page.addInitScript(() => {
    const w = window as unknown as { __reads: number };
    w.__reads = 0;
    const real = window.getComputedStyle;
    window.getComputedStyle = function (el, pseudo) {
      if (el instanceof HTMLUListElement && el.closest("[aria-roledescription=carousel]")) w.__reads++;
      return real.call(window, el, pseudo);
    };
  });
  await page.goto("/");
  await hydrated(page);
  const row = page.getByRole("group", { name: "Featured stock" }).locator(":scope > ul");
  await row.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => (window as unknown as { __reads: number }).__reads);
  const events = await row.evaluate(async (el) => {
    let n = 0;
    el.addEventListener("scroll", () => n++);
    el.style.scrollSnapType = "none"; // so each step stays where it is put
    for (let i = 1; i <= 20; i++) {
      el.scrollLeft = i * 10;
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    }
    el.style.scrollSnapType = "";
    return n;
  });
  expect(events).toBeGreaterThan(10);
  expect((await page.evaluate(() => (window as unknown as { __reads: number }).__reads)) - before).toBeLessThan(3);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`a buyer who scrolls to the featured row before the scripts run sees nothing move (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    // The scripts are held, so the row is surely on screen, as the server drew it, before React measures it.
    await page.route("**/_next/static/chunks/**", async (r) => {
      await new Promise((ok) => setTimeout(ok, 1000));
      await r.continue();
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__cls += (e as unknown as { value: number }).value))).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.querySelector("[aria-roledescription=carousel]")!.scrollIntoView({ block: "center" }));
    await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.01);
  });
}
