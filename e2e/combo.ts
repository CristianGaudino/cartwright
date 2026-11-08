import type { Locator } from "@playwright/test";

// The site's own drop-down: a combobox input that opens a list of options.
// Pick one by its label (text or pattern), or by its place in the list.
export async function choose(box: Locator, label: string | RegExp | number) {
  await box.click();
  const options = box.page().getByRole("listbox").getByRole("option");
  if (typeof label === "number") await options.nth(label).click();
  else await options.filter({ hasText: label }).first().click();
}

// The labels of every option, read by opening the list and closing it again.
export async function optionLabels(box: Locator): Promise<string[]> {
  await box.click();
  const labels = await box.page().getByRole("listbox").getByRole("option").allTextContents();
  await box.press("Escape");
  return labels.map((l) => l.trim());
}
