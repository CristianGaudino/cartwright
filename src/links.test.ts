import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Runs in npm test, so CI's check job fails on a dead or hash link, or an em dash, anywhere in src (PGS-04).
const SRC = join(process.cwd(), "src");
const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => /\.(tsx?|json|css)$/.test(f) && !/\.test\.tsx?$/.test(f));
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

// Built from escapes so this file never holds the patterns it hunts for.
const HASH = "\x23";
// JSX attributes (href="", href={""}) and link objects ({ href: "" }) alike.
const DEAD_HREF = new RegExp(`href\\s*[=:]\\s*(?:\\{\\s*)?(["'\`])(?:${HASH})?\\1`);
const EM_DASH = String.fromCharCode(0x2014);

describe("links and copy in src", () => {
  it("the dead-link matcher flags hash and empty hrefs, and passes a real one", () => {
    const q = String.fromCharCode(34);
    for (const bad of [`href=${q}${HASH}${q}`, `href=${q}${q}`, `href={${q}${HASH}${q}}`, `href={'${HASH}'}`, "href={``}", `{ href: ${q}${HASH}${q} }`]) expect(bad).toMatch(DEAD_HREF);
    expect(`href=${q}/used-cars${q}`).not.toMatch(DEAD_HREF);
    expect(`href=${q}${HASH}main${q}`).not.toMatch(DEAD_HREF);
  });

  it("no file links to a hash or an empty href", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.filter((f) => DEAD_HREF.test(read(f)))).toEqual([]);
  });

  it("no file contains an em dash", () => {
    expect(files.filter((f) => read(f).includes(EM_DASH))).toEqual([]);
  });

  it("every header and footer route has a page", () => {
    const paths = ["components/SiteHeader.tsx", "components/SiteFooter.tsx"].flatMap((f) => [...read(f).matchAll(/href[:=]\s*"(\/[^"]*)"/g)].map((m) => m[1]));
    expect(paths).toContain("/terms");
    // A route is a page.tsx path under app with route groups, like (browse), taken out.
    const routes = new Set(files.filter((f) => /^app\/(.*\/)?page\.tsx$/.test(f)).map((f) => `/${f.slice(4, -"page.tsx".length)}`.replace(/\([^/]+\)\//g, "").replace(/(.)\/$/, "$1")));
    const missing = [...new Set(paths)].filter((p) => !routes.has(p));
    expect(missing).toEqual([]);
  });
});
