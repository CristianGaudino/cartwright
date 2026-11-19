import type { Page } from "@playwright/test";

// A tap before React attaches does nothing on a touch device (the suite runs as a phone).
export const ready = (page: Page) =>
  page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
