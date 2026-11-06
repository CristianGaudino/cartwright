---
phase: 01-design-and-stock-browsing
plan: 05
subsystem: stock-page
tags: [stock-page, url-state, car-page, next16]

requires:
  - phase: 01-03
    provides: "stock provider, demo cars and photos, public/_headers"
  - phase: 01-04
    provides: "tokens, SiteHeader, logo, parseStockQuery, stockHref, formatters"
provides:
  - "src/app/used-cars/(browse)/page.tsx: dynamic stock page (parse, query, render inside StockShell), noindex"
  - "src/app/used-cars/[slug]/page.tsx: minimal real car page, notFound for unknown slugs, noindex"
  - "src/components/stock/StockShell.tsx: client shell with StockShell and useStock (optimistic query, pending dim, navigate, sticky bar, live count, Sort)"
  - "src/components/stock/StockResults.tsx, ListingCard.tsx, icons.tsx"
  - "e2e/stock.spec.ts and CI worker checks for /used-cars, a car, a photo with its noindex header, and the 404 route"
affects: [01-06, 01-07, 01-08, 01-09]

actuals:
  tokens: 17000
  tasks: 3
  commits: 3
plan_head_before: a144cb0611d212ca6706c509d3cbdfc13eb5ddbe
plan_head_after: aafa080aaac015660eb5ed208f473c7a17dfbf2d

tech-stack:
  added: []
  patterns: ["useOptimistic + useTransition around router.replace for a dimmed, never-blank update", "route group (browse) so a later loading.tsx stays off the car route"]

key-files:
  created:
    - "src/app/used-cars/(browse)/page.tsx"
    - "src/app/used-cars/[slug]/page.tsx"
    - src/components/stock/StockShell.tsx
    - src/components/stock/StockResults.tsx
    - src/components/stock/ListingCard.tsx
    - src/components/stock/icons.tsx
    - e2e/stock.spec.ts
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "StockShell owns the <main>, h1, count and Sort; the page only parses, queries and passes the cars as children"
  - "The count has data-testid=count so the E2E does not depend on layout; Sort renders twice (sticky bar below lg, count row from lg) and the E2E uses select:visible"
  - "Whole card is clickable through a stretched title link (after:absolute after:inset-0); the photo link stays tabindex -1 and aria-hidden"

requirements-completed: [DES-01, BRW-02, BRW-03]

duration: 40min
completed: 2026-11-05
status: complete
---

# Phase 1 Plan 05: Stock page, car page and sort Summary

**/used-cars lists the 57 real demo cars (12 per page) in the UI-SPEC look, sort and page live in the URL and update without a reload (old results dim to 60%, never blank), and every card opens a real /used-cars/[slug] page; CI now checks the Worker serves the stock routes and that /stock/ photos carry `x-robots-tag: noindex`.**

## Phase 2 routing note

The car route is the dynamic segment `src/app/used-cars/[slug]`. Next.js rejects two different dynamic segment names at the same level, so any later dynamic route directly under /used-cars (landing pages such as /used-cars/{make}) must reuse `[slug]` and branch inside it. Never add a sibling such as `[make]`.

## Accomplishments
- `/used-cars` (route group `(browse)`, so the URL is unchanged and 01-09's `loading.tsx` will not touch the car route): async page, `PageProps<"/used-cars">`, `parseStockQuery` then `stock.query`, noindex with a `shortcut:` comment.
- `ListingCard`: 4:3 reserved photo box, 900 x 675 image, first two cards eager with `fetchPriority="high"`, price first (Heading, tabular), title clamped to 2 lines, meta clamped to 2 lines, hover lift on pointer devices, press scale, empty 44px save slot left alone.
- `StockResults`: 1/2/3 column grid and pagination (Previous, Next, "Page n of m" with the accent pill), hidden at one page.
- `StockShell`: `useOptimistic(query)` + `useTransition`, `navigate` runs `router.replace(stockHref(next), { scroll })` inside the transition. Sticky translucent bar below `lg` (blur and saturate, solid under `reduce-transparency:`, border under `contrast-more:`), count in `aria-live="polite"`, native Sort select with `useId` ids. `summary` is nullable for 01-09.
- Car page: back link, title, price, photos (1 column, 2 from `sm`), spec list that drops missing rows, `notFound()` before rendering. No `loading.tsx` anywhere above it, so unknown slugs are a real 404.
- CI worker job takes an expected status per path (/, /robots.txt, /used-cars, a real car, a real photo, /used-cars/not-a-car as 404) and fails unless the photo answers with an `x-robots-tag` containing `noindex`; it prints `cache-control` for the record.

## Task Commits
1. Task 1 (tracer): `566c157` feat(01-05): /used-cars lists the demo cars in the new design
2. Task 2: `5b258de` feat(01-05): a real car page behind every card, CI checks on the Worker
3. Task 3: `aafa080` feat(01-05): sort without reloading, sticky filter bar, live count

## Verification (by exit code)
- `npm run typecheck`: 0. `npm run lint`: 0. `npm test`: 0 (110 tests). `npm run build`: 0.
- `npx playwright test e2e/stock.spec.ts e2e/smoke.spec.ts` on the production build: 13 passed (Pixel 7 profile, plus a 320px block and a 1280px block).
- Worker check run locally with the CI commands (`opennextjs-cloudflare build`, `wrangler dev`): all six paths returned the wanted status, the photo answered `Cache-Control: public, max-age=31536000, immutable` and `x-robots-tag: noindex`, and the Worker log held no ERROR. So `public/_headers` is applied by the Worker as is; no change to how the header is delivered was needed (RESEARCH A8: cache-control is as expected).
- Logo check from 01-04: `public/brand/logo.png` is a 650 x 270 PNG (exit 0), so threat T-01-19 is closed.
- Greps: no `dangerouslySetInnerHTML` in `src/`, no `console.` in `src/app/used-cars` or `src/components/stock`, none of `text-xs|sm|lg|xl|2xl|3xl` in `src/app` or `src/components`, no em dash in `src/app` or `src/components`, `line-clamp-2` twice in `ListingCard.tsx`, no `loading.tsx` under `src/app/used-cars`.
- Screenshot of the production build on a Pixel 7 profile looks right: ink header with the logo, quiet Display heading, count, Sort, white card with price first.

## Not verified
- The task 3 human check (a person scrolling and sorting on a real phone, judging smoothness) is not done. Automated checks cover the dimmed state, replace-not-push, sticky versus static and no skeleton.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] E2E raced the click-through navigation**
- **Found during:** Task 2
- **Issue:** The car page test read the h1 and price right after the click, while the stock page was still showing (12 price matches).
- **Fix:** Wait for the car URL before asserting, in the car page test and the 320px test.
- **Files modified:** `e2e/stock.spec.ts`
- **Commit:** 5b258de

No other deviations. Note: `grep` for an em dash across `src/lib` finds the literal in `src/lib/stock/demo-cars.test.ts` (a regex that forbids dashes in the data, from 01-03). It is a test, not site copy, and is out of scope.

## Requirements
DES-01, BRW-02 and BRW-03 are marked complete because this plan's own must-haves for them hold (design followed, five sort keys in the URL, sort and page reproduce in a new context). BRW-03's requirement text also names filter state in the URL; the filter params parse already, and 01-06 adds the controls.

## Known Stubs
None. The reserved top-right save slot on the card is empty by design (Phase 3).

## Threat Flags
None. T-01-13 (no `dangerouslySetInnerHTML`, all query values through `parseStockQuery`), T-01-16 (no logging), T-01-17 (noindex on both pages, photo header now enforced in CI) and T-01-18 (unknown slug calls `notFound()`, tested) are mitigated as planned.

## Self-Check: PASSED
Files exist: both `page.tsx` routes, `StockShell.tsx`, `StockResults.tsx`, `ListingCard.tsx`, `icons.tsx`, `e2e/stock.spec.ts`. Commits 566c157, 5b258de and aafa080 are on `feat/phase-1-stock-browsing`.
