import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { choose, optionLabels } from "./combo";
import { formatKm, formatPrice } from "../src/lib/stock/format";

const PER_PAGE = 12;
const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));
const countText = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${n} cars`);

// Pixel 7 is a touch device, so wait for React to attach before the first click: a click before that does nothing.
async function open(page: Page, url = "/used-cars") {
  await page.goto(url);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}

// The groups start closed unless something in them is chosen (and Make). Most tests want every option on screen.
async function openGroups(page: Page) {
  const scope = (await page.locator("aside").isVisible()) ? page.locator("aside") : sheet(page);
  const closed = scope.locator("details:not([open]) > summary");
  while (await closed.count()) await closed.first().click();
}

const makeGroup = (page: Page) => page.getByRole("group", { name: "Make" });
const box = (page: Page, value: string) => makeGroup(page).locator(`input[value="${value}"]`);

// The options currently on screen in a group: value, label and count, all read from the page.
async function rows(page: Page, name = "Make") {
  return page.getByRole("group", { name }).locator("label").evaluateAll((ls) =>
    ls.map((l) => ({
      value: l.querySelector("input")!.value,
      label: l.querySelector("span")!.textContent!,
      count: Number(l.querySelector("[data-testid=facet-count]")?.textContent ?? NaN),
    })),
  );
}

const showAll = (page: Page) => makeGroup(page).getByRole("button", { name: /^Show all \d+$/i });
const titles = (page: Page) => page.locator("article h2").allTextContents();
const metas = (page: Page) => page.locator("article > div:last-child > p:last-child").allTextContents();
const prices = (page: Page) => page.locator("article [data-price]").allTextContents().then((l) => l.map(digits));
const search = (page: Page) => page.getByRole("searchbox", { name: "Search make or model" });
const select = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });

const filtersButton = (page: Page) => page.getByRole("button", { name: /^Filters/ });
const sheet = (page: Page) => page.getByRole("dialog", { name: "Filters" });
const primary = (page: Page) => sheet(page).getByRole("button", { name: /^(Show \d+ cars?|Show cars|No cars match)$/ });
const showText = (n: number) => (n === 0 ? "No cars match" : n === 1 ? "Show 1 car" : `Show ${n} cars`);

const chip = (page: Page, name: string, label: string) =>
  page.getByRole("group", { name }).getByRole("button").filter({ has: page.locator("span.truncate", { hasText: new RegExp(`^${label}$`) }) });

// Chips of a group as the page shows them: label, count and states.
const chips = (page: Page, name: string) =>
  page.getByRole("group", { name }).getByRole("button").evaluateAll((bs) =>
    bs.map((b) => ({
      label: b.querySelector("span.truncate")!.textContent!,
      text: b.textContent!,
      count: Number(b.querySelector("span.shrink-0")?.textContent ?? NaN),
      pressed: b.getAttribute("aria-pressed") === "true",
      disabled: b.getAttribute("aria-disabled") === "true",
    })),
  );

test.describe("filters on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("ticking makes filters the cars through the URL, with honest counts", async ({ page }) => {
    await open(page);
    await expect(makeGroup(page)).toHaveCount(1);
    const before = await rows(page);
    const live = before.filter((r) => r.count > 0);
    const [a, b] = live;

    await box(page, a.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${a.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));
    await expect(page.locator("article")).toHaveCount(Math.min(PER_PAGE, a.count));
    for (const t of await titles(page)) expect(t.startsWith(a.label)).toBe(true);

    // Disjunctive: the other makes keep real counts so a second one can be added.
    const after = await rows(page);
    for (const r of live.slice(1)) expect(after.find((x) => x.value === r.value)!.count, r.label).toBeGreaterThan(0);

    await box(page, b.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${a.value},${b.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count + b.count));
  });

  test("chips remove one filter, Clear all filters removes them all, and neither shows with no filter", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear all filters" })).toHaveCount(0);

    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Clear all filters" })).toBeVisible();

    await page.getByRole("button", { name: `Remove ${a.label}` }).click();
    await expect(page).toHaveURL(/\/used-cars$/);
    await expect(box(page, a.value)).not.toBeChecked();

    await box(page, a.value).check();
    await expect(page).toHaveURL(/make=/);
    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page).toHaveURL(/\/used-cars$/);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  });

  test("with no filter the make counts add up to the total (BRW-04)", async ({ page }) => {
    await open(page);
    if (await showAll(page).count()) await showAll(page).click();
    const sum = (await rows(page)).reduce((n, r) => n + r.count, 0);
    expect(sum).toBe(digits(await page.getByTestId("count").textContent()));
  });

  test("Show all and Show fewer on the Make group", async ({ page }) => {
    await open(page);
    const checkboxes = makeGroup(page).getByRole("checkbox");
    if (!(await showAll(page).count())) {
      await expect(page.getByRole("button", { name: /^Show all/i })).toHaveCount(0);
      return;
    }
    const n = digits(await showAll(page).textContent());
    expect(n).toBeGreaterThan(8);
    await expect(checkboxes).toHaveCount(8);
    await showAll(page).click();
    await expect(checkboxes).toHaveCount(n);
    // The list grows; the sheet or sidebar around it scrolls. A scroll box inside a scroll box traps a finger on a phone.
    expect(await makeGroup(page).getByTestId("facet-list").evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
    await makeGroup(page).getByRole("button", { name: "Show fewer" }).click();
    await expect(checkboxes).toHaveCount(8);
  });

  test("a ticked make ranked ninth or lower stays visible and checked (BRW-01)", async ({ page }) => {
    await open(page);
    expect(await showAll(page).count(), "needs more than 8 makes").toBe(1);
    await showAll(page).click();
    const last = (await rows(page)).at(-1)!;
    await box(page, last.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${last.value}$`));
    await makeGroup(page).getByRole("button", { name: "Show fewer" }).click();
    await expect(box(page, last.value)).toBeChecked();
    await expect(makeGroup(page).getByRole("checkbox")).toHaveCount(9);

    await open(page, `/used-cars?make=${last.value}`);
    await expect(box(page, last.value)).toBeVisible();
    await expect(box(page, last.value)).toBeChecked();
  });

  test("one copy of the filter groups and no Filters button", async ({ page }) => {
    await open(page);
    await expect(makeGroup(page)).toHaveCount(1);
    await expect(filtersButton(page)).toHaveCount(0);
  });

  test("search, one box, 250ms pause, never disabled", async ({ page }) => {
    await open(page);
    await expect(search(page)).toHaveCount(1);
    await expect(search(page)).toHaveAttribute("maxlength", "80");
    await search(page).fill("a");
    await expect(page).toHaveURL(/q=a$/);
    await expect(search(page)).toBeEnabled();
    await expect(page.getByRole("button", { name: "Remove Search: a" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all filters" }).click();
    await expect(page).toHaveURL(/\/used-cars$/);
    await expect(search(page)).toHaveValue("");
  });

  test("Model waits for a make, lists that make's models and drops them with it", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("group", { name: "Model" })).toHaveCount(0);
    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page.getByRole("group", { name: "Model" })).toBeVisible();
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));
    const m = (await rows(page, "Model")).find((r) => r.count > 0)!;
    await page.getByRole("group", { name: "Model" }).locator(`input[value="${m.value}"]`).check();
    await expect(page).toHaveURL(new RegExp(`model=${m.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(m.count));
    for (const t of await titles(page)) expect(t).toContain(m.label);
    await box(page, a.value).uncheck();
    await expect(page).toHaveURL(/\/used-cars$/);
    await expect(page.getByRole("group", { name: "Model" })).toHaveCount(0);
  });

  test("Year, Budget, Mileage, Body, Fuel and Transmission each filter and write their param", async ({ page }) => {
    await open(page);
    await openGroups(page);
    const all = (await page.getByTestId("count").textContent())!;
    const clear = async () => {
      await page.getByRole("button", { name: "Clear all filters" }).click();
      await expect(page.getByTestId("count")).toHaveText(all); // wait for the unfiltered facets before reading chips
    };
    const from = select(page, "From");
    const years = (await optionLabels(from)).map(Number).filter(Boolean);
    const newest = Math.max(...years);
    await choose(from, String(newest));
    await expect(page).toHaveURL(new RegExp(`yearFrom=${newest}$`));
    await expect.poll(async () => (await metas(page)).length > 0 && (await metas(page)).every((m) => m.startsWith(String(newest)))).toBe(true);
    await clear();

    await choose(select(page, "Max"), formatPrice(25000));
    await expect(page).toHaveURL(/priceMax=25000$/);
    await expect.poll(async () => (await prices(page)).length > 0 && (await prices(page)).every((p) => p <= 25000)).toBe(true);
    await choose(select(page, "Min"), formatPrice(10000));
    await expect(page).toHaveURL(/priceMin=10000&priceMax=25000$/);
    await expect.poll(async () => (await prices(page)).every((p) => p >= 10000 && p <= 25000)).toBe(true);
    await clear();

    await choose(select(page, "Up to"), formatKm(80000));
    await expect(page).toHaveURL(/kmMax=80000$/);
    await expect
      .poll(async () => {
        const km = (await metas(page)).map((m) => /([\d,]+) km/.exec(m)?.[1]).filter(Boolean).map((v) => digits(v!));
        return km.length > 0 && km.every((k) => k <= 80000);
      })
      .toBe(true);
    await clear();

    const body = (await chips(page, "Body type")).find((c) => c.count > 0)!;
    await chip(page, "Body type", body.label).click();
    await expect(page).toHaveURL(/body=/);
    await expect(page.getByRole("group", { name: "Body type" }).getByRole("button", { pressed: true })).toHaveCount(1);
    await expect(page.getByTestId("count")).toHaveText(countText(body.count));
    await clear();

    const fuel = (await chips(page, "Fuel")).find((c) => c.count > 0)!;
    await chip(page, "Fuel", fuel.label).click();
    await expect(page).toHaveURL(/fuel=/);
    await expect(page.getByTestId("count")).toHaveText(countText(fuel.count));
    await clear();

    const gearbox = page.getByRole("radiogroup", { name: "Transmission" });
    await gearbox.getByText("Automatic").click();
    await expect(page).toHaveURL(/gearbox=automatic$/);
    await expect(page.getByRole("radio", { name: "Automatic" })).toBeChecked();
    await gearbox.getByText("Any").click();
    await expect(page).toHaveURL(/\/used-cars$/);
  });

  test("a From above To (or Min above Max) pulls the other bound along instead of showing no cars", async ({ page }) => {
    await open(page);
    await openGroups(page);
    const years = (await optionLabels(select(page, "From"))).map(Number).filter(Boolean);
    const [newest, oldest] = [Math.max(...years), Math.min(...years)];
    expect(newest).toBeGreaterThan(oldest);
    await choose(select(page, "To"), String(oldest));
    await expect(page).toHaveURL(new RegExp(`yearTo=${oldest}$`));
    await choose(select(page, "From"), String(newest));
    await expect(page).toHaveURL(new RegExp(`yearFrom=${newest}&yearTo=${newest}$`));
    await expect(select(page, "To")).toHaveValue(String(newest));
    await choose(select(page, "To"), String(oldest));
    await expect(page).toHaveURL(new RegExp(`yearFrom=${oldest}&yearTo=${oldest}$`));
    await expect(select(page, "From")).toHaveValue(String(oldest));

    await choose(select(page, "Min"), formatPrice(25000));
    await choose(select(page, "Max"), formatPrice(10000));
    await expect(page).toHaveURL(/priceMin=10000&priceMax=10000$/);
    await expect(select(page, "Min")).toHaveValue(formatPrice(10000));
  });

  test("Back to used cars on a car page returns to the filtered list the buyer came from", async ({ page }) => {
    await open(page);
    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${a.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));
    await page.locator("article h2 a").first().click();
    await expect(page).toHaveURL(/\/used-cars\/[a-z0-9-]+$/);
    const back = page.getByRole("link", { name: "Stock", exact: true });
    await expect(back).toHaveAttribute("href", `/used-cars?make=${a.value}`); // set once the page has hydrated
    await back.click();
    await expect(page).toHaveURL(new RegExp(`/used-cars\\?make=${a.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));
  });

  test("an option with a zero count and no tick is aria-disabled; anything with a count is not", async ({ page }) => {
    await open(page);
    await openGroups(page);
    if (await showAll(page).count()) await showAll(page).click();
    const smallest = (await rows(page)).filter((r) => r.count > 0).sort((x, y) => x.count - y.count)[0];
    await box(page, smallest.value).check();
    await expect(page.getByTestId("count")).toHaveText(countText(smallest.count));
    await expect.poll(async () => (await chips(page, "Body type")).some((c) => c.count === 0)).toBe(true);
    let zero = 0;
    for (const c of [...(await chips(page, "Body type")), ...(await chips(page, "Fuel"))]) {
      expect(c.disabled, c.label).toBe(c.count === 0 && !c.pressed);
      if (c.count === 0) zero++;
    }
    expect(zero).toBeGreaterThan(0);
    const disabledBoxes = await makeGroup(page).locator('input[aria-disabled="true"]').count();
    const zeroBoxes = (await rows(page)).filter((r) => r.count === 0 && r.value !== smallest.value).length;
    expect(disabledBoxes).toBe(zeroBoxes);
  });

  test("the groups are accordion rows: Make is open, the rest closed, and a chosen value opens its group", async ({ page }) => {
    await open(page);
    const group = (title: string) => page.locator("aside details").filter({ has: page.locator("summary", { hasText: new RegExp(`^${title}$`) }) });
    await expect(group("Make")).toHaveAttribute("open", "");
    await expect(group("Year")).not.toHaveAttribute("open", "");
    await expect(select(page, "From")).toBeHidden();
    await group("Year").locator("summary").click();
    await expect(select(page, "From")).toBeVisible();
    await group("Year").locator("summary").click();
    await expect(select(page, "From")).toBeHidden();
    // Closing a group does not drop what is chosen in it.
    await open(page, "/used-cars?yearFrom=2020&fuel=petrol");
    await expect(group("Year")).toHaveAttribute("open", "");
    await expect(group("Fuel")).toHaveAttribute("open", "");
    await expect(group("Mileage")).not.toHaveAttribute("open", "");
  });

  test("a shared URL with filters and sort opens the same cars in the same order (BRW-03)", async ({ page, browser }) => {
    await open(page);
    await openGroups(page);
    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));
    const body = (await chips(page, "Body type")).find((c) => c.count > 0)!;
    await chip(page, "Body type", body.label).click();
    await expect(page).toHaveURL(/body=/);
    await choose(page.getByRole("combobox", { name: "Sort" }), "Price: high to low");
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect
      .poll(async () => {
        const p = await prices(page);
        return p.every((x, i) => i === 0 || p[i - 1] >= x);
      })
      .toBe(true);
    const url = page.url();
    const expected = await titles(page);
    expect(expected.length).toBeGreaterThan(0);

    const ctx = await browser.newContext({ baseURL: new URL(url).origin });
    const other = await ctx.newPage();
    await other.goto(url);
    expect(await titles(other)).toEqual(expected);
    await ctx.close();
  });

  test("a failed load keeps every filter, without counts, and the chips keep their names", async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, "needs the failure switch, which only the local server has");
    await open(page);
    const first = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, first.value).check();
    await expect(page.getByTestId("count")).toHaveText(countText(first.count));
    const makes = (await rows(page)).map((r) => r.label);
    const body = (await chips(page, "Body type")).map((c) => c.label);
    const fuel = (await chips(page, "Fuel")).map((c) => c.label);

    await search(page).fill("e2e-forced-failure");
    await expect(page.getByRole("heading", { name: "We could not load the cars" })).toBeVisible();

    expect((await rows(page)).map((r) => r.label)).toEqual(makes);
    expect((await rows(page)).every((r) => Number.isNaN(r.count))).toBe(true);
    expect(await makeGroup(page).locator("label").allTextContents()).toEqual(makes);
    await expect(makeGroup(page).locator('[aria-disabled="true"]')).toHaveCount(0);
    await expect(box(page, first.value)).toBeChecked();
    for (const [name, labels] of [["Body type", body], ["Fuel", fuel]] as const) {
      const now = await chips(page, name);
      expect(now.map((c) => c.label)).toEqual(labels);
      for (const c of now) {
        expect(c.text).toBe(c.label);
        expect(c.disabled).toBe(false);
      }
    }
    await expect(page.getByRole("combobox", { name: "Sort" })).toBeEnabled();
    await expect(page.getByRole("button", { name: `Remove ${first.label}` })).toBeVisible();

    await search(page).fill("");
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.getByTestId("count")).toHaveText(countText(first.count));
    expect((await rows(page)).every((r) => !Number.isNaN(r.count))).toBe(true);
  });
});

test.describe("filters on a phone", () => {
  test("the sidebar is hidden below 1024px", async ({ page }) => {
    await page.goto("/used-cars");
    await expect(page.locator("article").first()).toBeVisible();
    await expect(makeGroup(page)).toHaveCount(0);
    await expect(select(page, "From")).toHaveCount(0);
  });

  test("one search box", async ({ page }) => {
    await page.goto("/used-cars");
    await expect(search(page)).toHaveCount(1);
  });

  test("Enter in the search box closes the keyboard and the search still runs", async ({ page }) => {
    await open(page);
    await expect(search(page)).toHaveAttribute("enterkeyhint", "search");
    await search(page).fill("a");
    await search(page).press("Enter");
    await expect(search(page)).not.toBeFocused();
    await expect(page).toHaveURL(/q=a$/);
  });

  test("scrolled past the first cards, the sticky bar's Filters and Sort are still what a tap hits, not a photo", async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect(page.getByTestId("sticky-bar")).toHaveCSS("position", "sticky");
    // The tap point of the control must belong to the control itself, not to a photo link painted over it.
    const hit = (control: Locator) =>
      control.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      });
    expect(await hit(filtersButton(page))).toBe(true);
    expect(await hit(select(page, "Sort"))).toBe(true);
  });

  test("Filters opens the sheet, ticks apply instantly and the button shows the provider's count (BRW-01, BRW-04)", async ({ page }) => {
    await open(page);
    await expect(sheet(page)).toHaveCount(0);
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    await expect(makeGroup(page)).toHaveCount(1);
    await expect(search(page)).toHaveCount(1); // the page's box; the sheet has none

    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${a.value}$`));
    await expect(primary(page)).toHaveText(showText(a.count));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));

    await primary(page).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(filtersButton(page)).toBeFocused();
    await expect(page.getByTestId("filter-badge")).toHaveText("1");
  });

  test("Escape, Close filters and the scrim close the sheet and focus returns to Filters", async ({ page }) => {
    await open(page);
    const ways = [
      () => page.keyboard.press("Escape"),
      () => sheet(page).getByRole("button", { name: "Close filters" }).click(),
      () => page.mouse.click(200, 20), // above the sheet, on the scrim
    ];
    for (const close of ways) {
      await filtersButton(page).click();
      await expect(sheet(page)).toBeVisible();
      await close();
      await expect(sheet(page)).toHaveCount(0);
      await expect(filtersButton(page)).toBeFocused();
    }
  });

  test("the sheet is at most 90% of the viewport, the groups scroll inside it and the button stays in view", async ({ page }) => {
    await open(page);
    await filtersButton(page).click();
    const height = page.viewportSize()!.height;
    await expect(sheet(page)).toBeVisible();
    await sheet(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)).then(() => 0)); // measure after the slide
    const sheetBox = (await sheet(page).boundingBox())!;
    expect(sheetBox.height).toBeLessThanOrEqual(height * 0.9 + 1);
    const button = (await primary(page).boundingBox())!;
    expect(button.y).toBeGreaterThanOrEqual(0);
    expect(button.y + button.height).toBeLessThanOrEqual(height);
    expect(await sheet(page).locator("div.overflow-y-auto").evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test("no match: the button reads No cars match and is disabled", async ({ page }) => {
    await open(page, "/used-cars?make=zzzz");
    await filtersButton(page).click();
    await expect(primary(page)).toHaveText("No cars match");
    await expect(primary(page)).toBeDisabled();
  });

  test("while results update the button keeps a real label and shows aria-busy", async ({ page }) => {
    await open(page);
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    await primary(page).evaluate((el) => {
      const w = window as unknown as { seen: string[]; busy: boolean };
      w.seen = [];
      w.busy = false;
      const record = () => {
        w.seen.push(el.textContent ?? "");
        if (el.getAttribute("aria-busy") === "true") w.busy = true;
      };
      record();
      new MutationObserver(record).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
    });
    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(primary(page)).toHaveText(showText(a.count));
    const { seen, busy } = await page.evaluate(() => {
      const w = window as unknown as { seen: string[]; busy: boolean };
      return { seen: w.seen, busy: w.busy };
    });
    expect(busy).toBe(true);
    expect(seen.length).toBeGreaterThan(1);
    for (const text of seen) expect(text).toMatch(/^(Show \d+ cars|Show 1 car|No cars match)$/);
  });

  test("a failed load: the button reads Show cars and the options stay usable without counts", async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, "needs the failure switch, which only the local server has");
    await open(page);
    await search(page).fill("e2e-forced-failure");
    await expect(page.getByRole("heading", { name: "We could not load the cars" })).toBeVisible();
    await filtersButton(page).click();
    await expect(primary(page)).toHaveText("Show cars");
    await expect(primary(page)).toBeEnabled();
    const makes = await rows(page);
    expect(makes.length).toBeGreaterThan(0);
    expect(makes.every((r) => Number.isNaN(r.count))).toBe(true);
    await expect(makeGroup(page).locator('[aria-disabled="true"]')).toHaveCount(0);
  });

  test("one copy of the filter groups: none closed, one open, none again", async ({ page }) => {
    // Not just hidden from the accessibility tree: closed, the sheet holds no filter inputs at all.
    const inputs = page.locator("dialog.sheet input");
    await open(page);
    await expect(makeGroup(page)).toHaveCount(0);
    await expect(inputs).toHaveCount(0);
    await filtersButton(page).click();
    await expect(makeGroup(page)).toHaveCount(1);
    await expect(inputs.first()).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(makeGroup(page)).toHaveCount(0);
    await expect(inputs).toHaveCount(0);
  });

  test("crossing 1024px with the sheet open closes it and leaves the page usable", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await open(page);
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("dialog.sheet[open]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    // The sidebar is live, not inert behind an invisible modal.
    const a = (await rows(page)).find((r) => r.count > 0)!;
    await box(page, a.value).check();
    await expect(page).toHaveURL(new RegExp(`make=${a.value}$`));
    await expect(page.getByTestId("count")).toHaveText(countText(a.count));

    // Coming back below 1024px, the sheet opens again as normal.
    await page.setViewportSize({ width: 800, height: 900 });
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
  });

  test("a ticked make ranked ninth or lower is visible and checked in the sheet without Show all (BRW-01)", async ({ page }) => {
    await open(page);
    await filtersButton(page).click();
    expect(await showAll(page).count(), "needs more than 8 makes").toBe(1);
    await showAll(page).click();
    const last = (await rows(page)).at(-1)!;

    await open(page, `/used-cars?make=${last.value}`);
    await filtersButton(page).click();
    await expect(showAll(page)).toBeVisible(); // still collapsed
    await expect(box(page, last.value)).toBeVisible();
    await expect(box(page, last.value)).toBeChecked();
  });

  test("the sheet slides on transform over 320ms, and cross-fades over 150ms with reduced motion", async ({ page }) => {
    const motion = () => sheet(page).evaluate((el) => ({ property: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration }));
    await open(page);
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    const normal = await motion();
    expect(normal.property).toContain("transform");
    expect(normal.duration).toContain("0.32s");

    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    const reduced = await motion();
    expect(reduced.property).toContain("opacity");
    expect(reduced.property).not.toContain("transform");
    expect(reduced.duration).toContain("0.15s");
  });

  test("at 320px wide the page never scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page);
    const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth);
    expect(await scrollWidth()).toBeLessThanOrEqual(320);
    await filtersButton(page).click();
    await expect(sheet(page)).toBeVisible();
    expect(await scrollWidth()).toBeLessThanOrEqual(320);
  });
});
