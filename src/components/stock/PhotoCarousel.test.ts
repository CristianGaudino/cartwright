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

  it("one photo: one slide, no dots, no arrows, no tile", () => {
    const html = render(1);
    expect(count(html, 'aria-roledescription="slide"')).toBe(1);
    expect(html).not.toContain("See all");
    expect(html).not.toContain("data-dot");
    expect(html).not.toContain("Next photo");
  });

  it("three photos: three photo slides plus the tile, three dots, both arrows mounted, Previous inert at the start", () => {
    const html = render(3);
    expect(count(html, 'aria-roledescription="slide"')).toBe(4);
    expect(count(html, 'aria-label="Photo ')).toBe(3);
    expect(count(html, "data-dot")).toBe(3);
    const button = (name: string) => html.match(new RegExp(`<button[^>]*aria-label="${name}"[^>]*>`))![0];
    expect(button("Next photo")).toContain('aria-disabled="false"');
    expect(button("Previous photo")).toContain('aria-disabled="true"');
  });

  it("photos are exposed: named slides, the alt text is the car, and the links are not aria-hidden", () => {
    const html = render(3);
    expect(html).toContain('aria-label="Photo 2 of 3"');
    // The server sends only the first photo; the others follow in the browser, a second after the card comes near the screen.
    expect(count(html, 'alt="2019 Audi A4"')).toBe(1);
    expect(html).not.toMatch(/<a[^>]*aria-hidden/);
  });

  it("the tile is a link to the car in the tab order, named for the real photo count, and is not a photo", () => {
    for (const n of [2, 3]) {
      const html = render(n);
      const slide = html.match(/<div[^>]*aria-label="See all \d+ photos"[^>]*>.*?<\/a>/)![0];
      expect(slide).toContain(`aria-label="See all ${n} photos"`);
      expect(slide).toContain('role="group"');
      expect(slide).toContain('aria-roledescription="slide"');
      const link = slide.match(/<a[^>]*>/)![0];
      expect(link).toContain('href="/used-cars/x"');
      expect(link).not.toContain("tabindex");
      expect(slide).toContain(`See all ${n} photos</span>`);
      expect(html).not.toContain(`of ${n + 1}`);
      expect(count(html, "data-dot")).toBe(n);
    }
  });

  it("priority makes the first image high priority, otherwise every image is lazy", () => {
    const first = (html: string) => html.match(/<img[^>]*>/)![0];
    expect(first(render(3, true))).toContain('fetchPriority="high"');
    expect(first(render(3, true))).not.toContain('loading="lazy"');
    expect(first(render(3, false))).toContain('loading="lazy"');
  });
});
