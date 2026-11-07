import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Demo = { id: string; slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;

// Old cartwright.ie pages end up at their new home, and the moved ones are permanent (308), so Google moves its listings across.
test("a moved page is a permanent redirect", async ({ request }) => {
  const res = await request.get("/apply-for-finance", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(new URL(res.headers().location, "http://x").pathname).toBe("/finance");
});

for (const [from, to] of [
  ["/apply-for-finance/", "/finance"],
  ["/car-sourcing/", "/find-a-car"],
  ["/terms-and-conditions/", "/terms"],
  ["/privacy-policy/", "/privacy"],
  ["/saved-cars/", "/saved"],
  ["/used-cars/", "/used-cars"],
  ["/service/", "/service"],
  ["/contact/", "/contact"],
]) {
  test(`old ${from} ends at ${to}`, async ({ request }) => {
    const res = await request.get(from); // the old pages end in a slash: that is dropped first, then the page moves
    expect(res.status()).toBe(200);
    expect(new URL(res.url()).pathname).toBe(to);
  });
}

test("an old car link goes to the same car, for good", async ({ request }) => {
  const res = await request.get(`/car-details/?${live.id}=2017%20Porsche%20Cayenne`, { maxRedirects: 0 });
  // The trailing slash redirects first; follow that one step.
  const hop = res.status() === 308 ? await request.get(res.headers().location, { maxRedirects: 0 }) : res;
  expect(hop.status()).toBe(301);
  expect(new URL(hop.headers().location, "http://x").pathname).toBe(`/used-cars/${live.slug}`);
});

test("an old car link for a car we do not have, or with no id, goes to the stock list", async ({ request }) => {
  for (const url of ["/car-details?999999999=Gone%20Car", "/car-details?", "/car-details?abc=1"]) {
    const res = await request.get(url, { maxRedirects: 0 });
    expect(res.status(), url).toBe(302);
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/used-cars");
  }
});
