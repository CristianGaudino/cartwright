---
phase: 01-design-and-stock-browsing
reviewed: 2026-11-06T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - .github/workflows/ci.yml
  - README.md
  - e2e/carousel.spec.ts
  - e2e/stock-filters.spec.ts
  - e2e/stock.spec.ts
  - eslint.config.mjs
  - next.config.ts
  - package.json
  - playwright.config.ts
  - public/_headers
  - scripts/stock/demo-stock.mjs
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/used-cars/(browse)/loading.test.ts
  - src/app/used-cars/(browse)/loading.tsx
  - src/app/used-cars/(browse)/page.tsx
  - src/app/used-cars/[slug]/page.tsx
  - src/components/SiteHeader.tsx
  - src/components/stock/AppliedFilters.tsx
  - src/components/stock/FilterSheet.tsx
  - src/components/stock/ListingCard.tsx
  - src/components/stock/PhotoCarousel.test.ts
  - src/components/stock/PhotoCarousel.tsx
  - src/components/stock/StockFilters.tsx
  - src/components/stock/StockResults.tsx
  - src/components/stock/StockShell.tsx
  - src/components/stock/icons.tsx
  - src/lib/stock/contract.test.ts
  - src/lib/stock/demo-cars.test.ts
  - src/lib/stock/demo-cars.json
  - src/lib/stock/file-provider.ts
  - src/lib/stock/format.test.ts
  - src/lib/stock/format.ts
  - src/lib/stock/index.ts
  - src/lib/stock/query.test.ts
  - src/lib/stock/query.ts
  - src/lib/stock/types.ts
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-11-06
**Depth:** standard
**Files Reviewed:** 38 (demo-cars.json skimmed for data sanity only)
**Status:** issues_found

## Summary

The stock library, URL parsing and server page are in good shape. `parseStockQuery` allow-lists every value (slug regex, enum membership, bounded digit-only integers, length caps), nothing is rendered with `dangerouslySetInnerHTML`, user text only reaches React text nodes and `aria-label`s, and the only `redirect()` target is the constant `/used-cars` path plus serialised params. Vitest (126 tests), `tsc --noEmit` and ESLint (0 errors) pass. No personal data is logged anywhere in the changed source.

`E2E_FAIL_QUERY` was checked end to end: it is read at request time from `process.env` (not inlined by Next, not `NEXT_PUBLIC_`), it is set only by the `webServer.env` of `playwright.config.ts`, it appears in no `wrangler.jsonc`, `deploy.yml` or `release.yml`, and the CI `worker` job asserts the trigger search shows the empty state, not the error state. As shipped it is unreachable in production; see IN-01 for the residual risk.

One real defect was reproduced in a browser (CR-01: the filter sheet can freeze the whole page). The rest are accessibility, scraper request discipline and tooling issues.

## Critical Issues

### CR-01: Resizing past 1024px with the filter sheet open leaves an invisible modal dialog that makes the whole page inert

**File:** `src/components/stock/FilterSheet.tsx:38-44`, `src/components/stock/StockShell.tsx:100-106`, `src/app/globals.css` (`body:has(dialog.sheet[open])`)
**Issue:** The `<dialog>` is rendered inside the sticky bar, which is `lg:hidden` (`display: none` from 1024px). If the sheet is open (opened with `showModal()`) and the viewport crosses 1024px, the dialog stays `open` and modal, so everything else is inert, but it is no longer rendered because its ancestor is `display: none`. Nothing in the component listens for the breakpoint change.
**Failure scenario (reproduced with Playwright against a production build):** at 800px wide, tap Filters, then resize to 1280px. Result: `dialog.open === true`, `dialog.getBoundingClientRect()` is `0x0`, `body` computed `overflow` is `hidden`, and clicking a sidebar checkbox times out because the document is inert. A tablet user who opens Filters in portrait and rotates to a 1024px-wide landscape (iPad) hits the same state: no visible dialog, no scrolling, no clickable controls. Escape may recover it (not verified), but nothing on screen says so.
**Fix:** Close the dialog when the desktop breakpoint matches.
```tsx
useEffect(() => {
  const mq = window.matchMedia("(min-width: 1024px)");
  const close = () => mq.matches && dialog.current?.close();
  mq.addEventListener("change", close);
  return () => mq.removeEventListener("change", close);
}, []);
```
(import `useEffect`). Alternatively render the `<dialog>` outside the `lg:hidden` container so it is never hidden while open.

## Warnings

### WR-01: Carousel photos are hidden from assistive technology, so the written alt text is never exposed

**File:** `src/components/stock/PhotoCarousel.tsx:65-72`
**Issue:** Each slide is a `role="group"` named "Photo n of N", but its only content is a `<Link aria-hidden="true" tabIndex={-1}>` wrapping the `<Image alt="...">`. `aria-hidden` removes the link and its image from the accessibility tree, so the `alt` text written on line 72 (and the "photo i of n" wording) is dead, and a screen reader walks N empty slide groups. The card title link elsewhere names the car, but the photos themselves convey nothing.
**Failure scenario:** a VoiceOver or NVDA user reaches the "Photos of 2019 Audi A4, carousel" group and gets "Photo 1 of 6, slide", "Photo 2 of 6, slide" with no content.
**Fix:** Pick one. Either treat the photos as decorative next to the title link (`alt=""` on the image, drop the per-slide `aria-label` noise, and keep the link hidden), or expose them: remove `aria-hidden` from the `Link`, keep `tabIndex={-1}`, and keep the alt text. If exposing, the link adds a duplicate link to the same destination per slide; prefer the decorative option.

### WR-02: Next and Previous buttons unmount while focused, dropping keyboard focus to `<body>`

**File:** `src/components/stock/PhotoCarousel.tsx:89-98`
**Issue:** The arrows are conditionally rendered (`index > 0`, `index < n - 1`). A keyboard user who presses Next repeatedly reaches the last photo, `index` becomes `n - 1`, and the focused Next button is removed from the DOM. Focus resets to the document, so the next Tab starts from the top of the page. The same happens on Previous at the first photo.
**Failure scenario:** a keyboard user on a desktop viewport tabs to Next, presses Enter five times to see six photos; on the sixth press focus vanishes and they lose their place in a 12-card grid.
**Fix:** Keep both buttons mounted and mark the end ones `disabled` (or `aria-disabled` plus no-op) instead of unmounting; hide them visually with the existing opacity classes. Update `carousel.spec.ts:315` (`toHaveCount(0)`) to assert `toBeDisabled()`.

### WR-03: The scraper follows redirects, which bypasses its host allowlist, logging and rate limit

**File:** `scripts/stock/demo-stock.mjs:49-62`
**Issue:** `get()` checks `https:` and `HOSTS`, waits, and logs, but then calls `fetch(url, ...)` with the default `redirect: "follow"`. Any 3xx (for example `/used-cars/` canonicalisation, a `/car-details/` slug redirect, or a CDN redirect) causes extra requests that are not logged to `requests.log`, not throttled by the 1500 ms gap, and not checked against `HOSTS`; a redirect to another host would be followed and its body cached as if it were the requested URL.
**Failure scenario:** the dealer's server answers `/car-details/x` with a 301 to a trailing-slash URL: two requests hit the site back to back, the README's "61 requests to www.cartwright.ie" total (derived from the log) under-reports, and the owner-authorised request discipline ("1.5 seconds apart, never retried") is not actually enforced.
**Fix:** `fetch(url, { ...init, redirect: "manual", headers })` and treat any non-2xx (including 3xx) as the existing hard failure, or follow at most one hop by calling `get()` recursively on the validated `Location` so it is logged, throttled and allow-listed.

### WR-04: Stock provider failures are swallowed with no log at all

**File:** `src/app/used-cars/(browse)/page.tsx:13-14`
**Issue:** `stock.query(query).catch(() => null)` discards the error entirely. The comment says "Nothing is logged (T-01-29)", which is right for the query (it can hold search text), but the error object and type are not personal data. `wrangler.jsonc` enables observability, yet a provider outage (the CarsIreland provider in #16 will do network I/O) is invisible: the visitor sees the error state and the team sees nothing.
**Failure scenario:** the future feed provider starts throwing on every request; the site shows "We could not load the cars" to everyone and no log line or alert exists to say why.
**Fix:** Log a constant message and the error name only, never the query:
```ts
const result = await stock.query(query).catch((e: unknown) => {
  console.error("stock.query failed", e instanceof Error ? e.name : typeof e);
  return null;
});
```

### WR-05: `npm run lint` lints the scraper's cached third-party bundle

**File:** `eslint.config.mjs:24`
**Issue:** `globalIgnores` lists `.next`, `.open-next`, `.wrangler`, `test-results` and others but not `.stock-cache/**`. After `npm run stock:fetch`, the dealer's minified `main.js` is linted and produces about 430 warnings (confirmed: 431 warnings, all but one from `.stock-cache/main.js`), which buries real warnings such as `scripts/stock/demo-stock.mjs:278` (`no-unused-expressions` on the `else (...)` command dispatch). CI is unaffected because the cache is gitignored, so the problem only shows on the machine that ran the scraper.
**Failure scenario:** a developer runs the scraper, then `npm run lint`; a genuine new warning is invisible among 431.
**Fix:** add `".stock-cache/**"` to `globalIgnores`, and add `.stock-cache/` to the root `.gitignore` as a backstop to the cache's self-written `.gitignore`. Also rewrite `demo-stock.mjs:276-278` as a plain `if/else if/else` block.

## Info

### IN-01: The E2E failure switch ships in the production bundle

**File:** `src/lib/stock/index.ts:10-14`, `playwright.config.ts:14`
**Issue:** Verified unreachable as shipped, but the branch exists in every build and activates for any visitor who requests `?q=<value>` if `E2E_FAIL_QUERY` is ever defined in the Worker (a dashboard variable, a `[vars]` entry, a `.dev.vars`). Then anyone can force the error state for all of that search, and `process.env` on Workers with `nodejs_compat` is populated from bindings. The CI `worker` job (`ci.yml:68-71`) catches `wrangler.jsonc` vars only; it cannot see dashboard variables, and `deploy.yml` does not repeat the check. A `NODE_ENV`/`APP_ENV` guard is not possible because the E2E job runs a production build with `APP_ENV=production`.
**Fix:** Accept the residual risk but document it next to the code, and add the same forced-failure `curl` assertion as a post-deploy smoke step, or compile the switch in only for the E2E build (for example read it from a build-time `env` in `next.config.ts` set only in the `e2e` job, so the production build contains no branch).

### IN-02: Scraper header comment overstates the rate limit

**File:** `scripts/stock/demo-stock.mjs:9`, `:53`
**Issue:** The header says every request is "at least 1500 ms apart", but the gap is 1500 ms only for `www.cartwright.ie` and 300 ms for `c0.carsie.ie` (343 photo requests). The README states the 1.5 second gap only for the dealer site, which is accurate; the code comment is not.
**Fix:** Change the comment to "dealer site: at least 1500 ms apart; photo CDN: at least 300 ms".

### IN-03: Scraper edge cases: price and `--limit`

**File:** `scripts/stock/demo-stock.mjs:229`, `:36`
**Issue:** `String(l.price).replace(/\D/g, "")` removes the decimal point, so a price of `"12,950.50"` becomes 1295050 (100 times too high). Current data is sane (EUR 4,950 to 84,950), so this is latent. Separately, `--limit` with a missing or non-numeric value gives `Number(undefined) = NaN`, and `slice(0, NaN)` selects zero cars, so `fetch` makes its three site requests and then does nothing, and `build` rewrites `demo-cars.json` as `[]` and wipes `public/stock`.
**Fix:** Parse the price with `Math.round(parseFloat(String(l.price).replace(/[^\d.]/g, "")))`; validate `LIMIT` (`Number.isInteger(LIMIT) && LIMIT > 0`) and exit with usage otherwise.

### IN-04: Contradictory ranges are accepted silently

**File:** `src/lib/stock/query.ts:47-51`
**Issue:** `yearFrom > yearTo` or `priceMin > priceMax` parse fine and return zero cars, and the empty state says "Try removing a filter" without saying which. Hand-edited URLs and the independent From/To selects both allow it.
**Fix:** In the select `onChange`, clear or clamp the opposite bound when they cross, or disable options on the other select that would cross.

### IN-05: "Back to used cars" on the car page drops the buyer's filters

**File:** `src/app/used-cars/[slug]/page.tsx:29`
**Issue:** The link is a constant `/used-cars`, so a buyer who filtered to 4 cars, opened one, and used the on-page link lands on the unfiltered list. The browser Back button preserves the state, the link does not.
**Fix:** Out of v1 scope if intended; otherwise make it `router.back()`-style via a small client link, or pass the list query in a `from` param validated through `parseStockQuery`.

### IN-06: Worker CI job hides the Wrangler log when the Worker never starts

**File:** `.github/workflows/ci.yml:53-60`
**Issue:** GitHub's default `run` shell is `bash -e`. If `wrangler dev` fails to start, `got=$(curl ... )` exits non-zero (connection refused, exit 7), and `errexit` aborts the script before the diagnostics on line 73 print `wrangler.log`. The job fails correctly but with no cause shown.
**Fix:** Add `|| true` to the `got=$(curl ...)` and `code=$(curl ...)` assignments (the `[ "$got" = "$2" ]` check already fails the case), or `cat wrangler.log` in a `trap ... EXIT`.

---

_Reviewed: 2026-11-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Fix status

All 12 findings fixed on `feat/phase-1-stock-browsing` (2026-11-06).

| ID | Commit | How |
|----|--------|-----|
| CR-01 | 4c539aa | `FilterSheet` listens to `(min-width: 1024px)` and closes the dialog, which lifts the scroll lock and inert state. E2E resizes 800px to 1280px with the sheet open, checks the sidebar is clickable, then reopens the sheet. |
| WR-01 | 1f5eefc | Photo links are no longer `aria-hidden` (still `tabIndex={-1}`), image alt is the car name, slides keep `role="group"` / `aria-roledescription="slide"` / "Photo n of N". |
| WR-02 | 1f5eefc | Previous and Next stay mounted. At an end the button is `aria-disabled`, ignores clicks, is invisible to the pointer and shows dimmed only while keyboard focused. No layout shift (absolute position, E2E compares boxes). |
| WR-03 | b9ad375 | Scraper `fetch` uses `redirect: "manual"`, so any 3xx is the existing hard failure. Verified offline only (no fetch run). |
| WR-04 | fc9f18c | Page logs `"stock.query failed"` plus the error name only. Never the query, params or URL. |
| WR-05 | fcfd35b | `.stock-cache/**` in ESLint `globalIgnores`, `/.stock-cache/` in `.gitignore`, dispatch rewritten as `if / else if / else`. Lint now reports 0 problems. |
| IN-01 | b18e7c2 | Residual risk and the upgrade path (build-time switch) documented beside the code. Not removed from the bundle, and no post-deploy smoke step was added (production URL is not in the repo). |
| IN-02 | b9ad375 | Header comment states 1500 ms for the dealer and 300 ms for the photo CDN. |
| IN-03 | b9ad375 | Price parsed with `Math.round(parseFloat(...))` keeping the decimal point. Missing or non-numeric `--limit` prints usage and exits 1. |
| IN-04 | 0cf0496 | New `withRange` helper: a From/To or Min/Max change that crosses the other bound moves the other bound. Unit and E2E tests. |
| IN-05 | 3f7b2cc | List page stores its URL in `sessionStorage`; the car page's `BackToCars` reads it through `parseStockQuery` / `stockHref`. Plain `/used-cars` on the server and without JavaScript. |

Also: `da6b738` lets `PORT` override the local E2E port (default 3000 unchanged).
