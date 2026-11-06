import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CarGallery } from "./CarGallery";

const photo = (i: number) => ({ src: `/stock/test/${i}.webp`, width: 900, height: 675 });
const render = (count: number) => renderToStaticMarkup(createElement(CarGallery, { photos: Array.from({ length: count }, (_, i) => photo(i)), name: "2019 Audi A4" }));

describe("CarGallery", () => {
  it("no photos: the empty box and nothing else", () => {
    const html = render(0);
    expect(html).toContain("No photo yet");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<img");
  });

  it("one photo: a tappable slide, no counter, arrows or thumbnails", () => {
    const html = render(1);
    expect(html).toContain('aria-label="View photo 1 of 1 larger"');
    expect(html).not.toContain("1 / 1");
    expect(html).not.toContain("Next photo");
    expect(html).not.toContain("Show photo");
  });

  it("three photos: counter, both arrows, thumbnails with the first current", () => {
    const html = render(3);
    expect(html).toContain("1 / 3");
    expect(html.match(/aria-label="Show photo \d"/g)).toHaveLength(3);
    expect(html.match(/<button[^>]*aria-label="Show photo 1"[^>]*>/)![0]).toContain('aria-current="true"');
    expect(html.match(/<button[^>]*aria-label="Previous photo"[^>]*>/)![0]).toContain('aria-disabled="true"');
    expect(html).toContain('alt="2019 Audi A4, photo 2 of 3"');
  });

  it("only the first photo is eager and high priority", () => {
    const imgs = render(3).match(/<img[^>]*>/g)!;
    expect(imgs[0]).toContain('fetchPriority="high"');
    expect(imgs[0]).toContain('loading="eager"');
    expect(imgs[1]).toContain('loading="lazy"');
  });
});
