import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoCarousel } from "./PhotoCarousel";

const photo = (i: number) => ({ src: `/stock/test/${i}.webp`, width: 900, height: 675 });
const render = (count: number, priority = false) =>
  renderToStaticMarkup(createElement(PhotoCarousel, { photos: Array.from({ length: count }, (_, i) => photo(i)), href: "/used-cars/x", label: "2019 Audi A4", priority }));
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("PhotoCarousel", () => {
  it("shows the empty panel for no photos", () => {
    const html = render(0);
    expect(html).toContain("No photo yet");
    expect(html).not.toContain('aria-roledescription="carousel"');
  });

  it("one photo: one slide, no dots, no arrows", () => {
    const html = render(1);
    expect(count(html, 'aria-roledescription="slide"')).toBe(1);
    expect(html).not.toContain("See all");
    expect(html).not.toContain("data-dot");
    expect(html).not.toContain("Next photo");
  });

  it("three photos, as the server sends them: only the first photo, and no dots or arrows yet", () => {
    // The others follow in the browser, a second after the card comes near the screen, so no slide is ever an empty box.
    const html = render(3);
    expect(count(html, 'aria-roledescription="slide"')).toBe(1);
    expect(count(html, 'aria-label="Photo ')).toBe(1);
    expect(html).toContain('aria-label="Photo 1 of 3"');
    expect(html).not.toContain("data-dot");
    expect(html).not.toContain("Next photo");
  });

  it("photos are exposed: named slides, the alt text is the car, and the links are not aria-hidden", () => {
    const html = render(3);
    expect(html).toContain('aria-label="Photo 1 of 3"');
    expect(count(html, 'alt="2019 Audi A4"')).toBe(1);
    expect(html).not.toMatch(/<a[^>]*aria-hidden/);
  });

  it("has no See all photos slide", () => {
    for (const n of [2, 3]) expect(render(n)).not.toContain("See all");
  });

  it("priority makes the first image high priority, otherwise every image is lazy", () => {
    const first = (html: string) => html.match(/<img[^>]*>/)![0];
    expect(first(render(3, true))).toContain('fetchPriority="high"');
    expect(first(render(3, true))).not.toContain('loading="lazy"');
    expect(first(render(3, false))).toContain('loading="lazy"');
  });
});
