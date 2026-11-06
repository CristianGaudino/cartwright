import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

const html = renderToStaticMarkup(createElement(Loading));

describe("stock skeleton", () => {
  it("renders 6 cards with the 4:3 photo box", () => {
    const cards = html.match(/<[^>]*data-skeleton[^>]*>[\s\S]*?(?=<[^>]*data-skeleton|$)/g) ?? [];
    expect(cards).toHaveLength(6);
    for (const c of cards) {
      expect(c).toContain("aspect-[4/3]");
      expect(c).toContain("bg-photo-bg");
    }
  });

  it("keeps the heading and has no shimmer", () => {
    expect(html).toContain("<h1");
    expect(html).toContain("Used cars");
    expect(html).not.toMatch(/class="[^"]*\banimate-/);
  });
});
