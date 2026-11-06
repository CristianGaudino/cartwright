import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const PER_PAGE = 12;
const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));
const countText = (n: number) => (n === 0 ? "No cars" : n === 1 ? "1 car" : `${n} cars`);

// Pixel 7 is a touch device, so wait for React to attach before the first click: a click before that does nothing.
async function open(page: Page, url = "/used-cars") {
  await page.goto(url);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
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

const showAll = (page: Page) => makeGroup(page).getByRole("button", { name: /^Show all \d+$/ });
const titles = (page: Page) => page.locator("article h2").allTextContents();

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
      await expect(page.getByRole("button", { name: /^Show all/ })).toHaveCount(0);
      return;
    }
    const n = digits(await showAll(page).textContent());
    expect(n).toBeGreaterThan(8);
    await expect(checkboxes).toHaveCount(8);
    await showAll(page).click();
    await expect(checkboxes).toHaveCount(n);
    expect(await makeGroup(page).getByTestId("facet-list").evaluate((el) => getComputedStyle(el).maxHeight)).toBe("320px");
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
});

test.describe("filters on a phone", () => {
  test("the sidebar is hidden below 1024px", async ({ page }) => {
    await page.goto("/used-cars");
    await expect(page.locator("article").first()).toBeVisible();
    await expect(makeGroup(page)).toHaveCount(0);
  });
});
