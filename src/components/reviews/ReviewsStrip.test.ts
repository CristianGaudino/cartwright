import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Review, Reviews } from "@/lib/reviews";
import { ReviewsStrip } from "./ReviewsStrip";

const PLACE = "https://maps.google.com/?cid=1";
const review = (over: Partial<Review> = {}): Review => ({ id: "r1", author: "Aoife B.", rating: 4, text: "Grand job.", relativeTime: "a week ago", reviewUri: "https://www.google.com/maps/reviews/1", ...over });
const data = (over: Partial<Reviews> = {}): Reviews => ({ source: "google", rating: 4.8, count: 5, placeUri: PLACE, reviews: [review()], ...over });
const render = (d: Reviews | null) => renderToStaticMarkup(createElement(ReviewsStrip, { data: d }));
const NEW_TAB = 'target="_blank" rel="noopener noreferrer"';

describe("ReviewsStrip", () => {
  it("renders nothing for null data or no reviews", () => {
    expect(render(null)).toBe("");
    expect(render(data({ reviews: [] }))).toBe("");
  });

  it("shows the aggregate row with a hidden sentence, a clipped star row and a new-tab link to the place", () => {
    const html = render(data());
    expect(html).toContain("Rated 4.8 out of 5 from 5 Google reviews");
    expect(html).toMatch(/<span aria-hidden="true" class="text-display[^"]*">4.8<\/span>/);
    expect(html).toContain("width:96%");
    expect(html).toContain("Based on 5 Google reviews");
    expect(html).toContain(`<a href="${PLACE}" ${NEW_TAB}`);
    expect(html).toContain("See All on Google Maps");
  });

  it("skips the aggregate row without a rating or a count and still shows the cards", () => {
    for (const d of [data({ rating: undefined }), data({ count: undefined })]) {
      const html = render(d);
      expect(html).not.toContain("Based on");
      expect(html).not.toContain("See All on Google Maps");
      expect(html).toContain("<article");
    }
  });

  it("links Google's review policy in a new tab", () => {
    expect(render(data())).toContain(`<a href="https://support.google.com/contributionpolicy/answer/7422880" ${NEW_TAB}`);
  });

  it("renders a lazy, no-referrer 40px photo only when Google supplies one", () => {
    const html = render(data({ reviews: [review({ photoUri: "https://lh3.googleusercontent.com/a" })] }));
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toMatch(/<img src="https:\/\/lh3.googleusercontent.com\/a" alt="" width="40" height="40" loading="lazy" referrerPolicy="no-referrer"/);
    expect(render(data())).not.toContain("<img");
  });

  it("links the author only when there is an author link", () => {
    expect(render(data({ reviews: [review({ authorUri: "https://www.google.com/maps/contrib/1" })] }))).toContain(`<a href="https://www.google.com/maps/contrib/1" ${NEW_TAB}`);
    expect(render(data())).not.toContain("maps/contrib");
    expect(render(data())).toContain("Aoife B.");
  });

  it("gives each card a hidden star row, a rating sentence, a Google Maps link and the attribution", () => {
    const html = render(data());
    expect(html).toContain("Rated 4 out of 5</span>");
    expect(html).toContain('<span aria-hidden="true" class="relative inline-flex');
    expect(html).toContain(`<a href="https://www.google.com/maps/reviews/1" ${NEW_TAB}`);
    expect(html).toContain("Google Maps</span>");
  });

  it("keeps the text unaltered with its language, and omits an empty text", () => {
    expect(render(data({ reviews: [review({ text: "Go maith", languageCode: "ga" })] }))).toContain('<p lang="ga" class="line-clamp-8 text-body">Go maith</p>');
    expect(render(data({ reviews: [review({ text: "" })] }))).not.toContain("line-clamp-8");
  });

  it("puts every review in the moving row, none hidden, with four across from 1024px", () => {
    const reviews = [1, 2, 3, 4, 5].map((n) => review({ id: `r${n}` }));
    const html = render(data({ reviews }));
    expect(html.match(/<article/g)).toHaveLength(5);
    expect(html).not.toContain("lg:hidden");
    expect(html).toContain("lg:w-[calc((100%-3rem)/4)]");
  });

  it("contains no em dash", () => {
    expect(render(data({ source: "demo" }))).not.toContain(String.fromCharCode(0x2014));
  });
});
