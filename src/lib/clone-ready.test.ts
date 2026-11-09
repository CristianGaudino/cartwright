import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// The site is meant to be cloned for another business (issue #134). The brand and the dealer's facts live in src/lib/site.ts, and
// everything else reads them from there. This fails when a page or component writes the brand, town or phone in by hand again.
// Allowed: src/lib/site.ts itself, tests, and the demo stock data and fixtures (replaced per clone, see docs/new-site-checklist.md).
const ALLOWED = [/^src\/lib\/site\.ts$/, /\.test\.tsx?$/, /demo-cars\.json$/, /worst-cars\.ts$/, /^src\/lib\/reviews\//];
const WORDS = /carright|cartwright|tralee|kerry|maglass|V92 ?NT93|083 ?133|353 ?83/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css|json)$/.test(name) ? [path] : [];
  });
}
// Comments may name the client; only code and strings count.
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

it("keeps the brand, town and phone out of the code, so a clone changes one file", () => {
  const found = files("src")
    .map((f) => f.replaceAll("\\", "/"))
    .filter((f) => !ALLOWED.some((a) => a.test(f)))
    .filter((f) => WORDS.test(code(readFileSync(f, "utf8"))));
  expect(found).toEqual([]);
});
