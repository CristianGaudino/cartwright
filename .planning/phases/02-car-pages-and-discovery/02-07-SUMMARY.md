---
phase: 02-car-pages-and-discovery
plan: 07
subsystem: landing-pages
tags: [landing-pages, seo, sitemap, routing, next16]
requires: ["02-01", "02-02", "02-04", "02-05", "02-06"]
provides:
  - "/used-cars/{make}, /used-cars/{body} and /used-cars/{make}/{model} landing pages (resolver order make, body, car)"
  - "landing.ts: pure facts, intro, metadata and ItemList JSON-LD"
  - "Empty state (200, noindex) with recently sold cars"
  - "Sitemap entries for landing pages with stock; Worker checks in CI"
affects: [02-08]
tech-stack:
  added: []
  patterns: ["one cached resolveLanding(slug, model?) shared by generateMetadata and the page", "landing data from taxonomy() plus one stock.query; facets give the chips"]
key-files:
  created:
    - src/lib/stock/landing.ts
    - src/lib/stock/landing.test.ts
    - src/components/landing/data.ts
    - src/components/landing/LandingPage.tsx
    - "src/app/used-cars/[slug]/[model]/page.tsx"
    - e2e/landing.spec.ts
  modified:
    - "src/app/used-cars/[slug]/page.tsx"
    - src/app/sitemap.ts
    - .github/workflows/ci.yml
key-decisions:
  - "Landing carries labels and slugs, so the type is wider than the plan's interface (makeSlug, bodySlug, modelSlug added)"
  - "A make or body page with one car drops the second sentence of the intro (matches the plan's one-car example); model pages keep Year(s)"
  - "Landing resolution lives in src/components/landing/data.ts, not in [slug]/page.tsx; the page calls it first, then falls back to the car lookup"
  - "Landing pages get no OG image"
requirements-completed: [CAR-06, CAR-03]
status: complete
duration: ~35 min
completed: 2026-11-06
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
plan_head_before: 24686c6bff14c5664f20252554cbd9c8fb43ae29
plan_head_after: 84e2759bbb7e68df36d679fea1b44f7901ee9031
---

# Phase 2 Plan 07: Landing pages Summary

Make, body-type and make+model landing pages with copy built only from live stock facts, link chips and a breadcrumb between them, an indexable-only-with-stock rule (empty pages answer 200, noindex, with recently sold cars), ItemList JSON-LD and sitemap entries. The 410 page's See more {Make} and the car page's See all {Make} now land on a real page.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: make landing page end to end | 10596da |
| 2 | Body and make+model pages, breadcrumb, chips, ItemList JSON-LD | 38ecd98 |
| 3 | Empty state, sitemap entries, Worker checks | 84e2759 |

Tracer gate: Task 1 `<verify>` (landing tests, typecheck, lint, build, `landing`, `car-page`, `gone` specs: 18 passed) re-run end to end before Task 2.

## Verification

- `npm test` 247 passed, `npx tsc --noEmit` and `npm run lint` exit 0.
- `APP_ENV=production` build and full `npm run e2e` (PORT=3116): 103 passed, none skipped in `landing.spec.ts` (the demo data has Volvo as an expired-only make and Tesla as a recently-sold-only make).
- Acceptance greps: no `soldAt` in app or components, no "Sold on", no em dash, `dangerouslySetInnerHTML` only in `JsonLd.tsx`, no lastmod in the sitemap, no `loading.tsx` in `[slug]`.

## Deviations from Plan

**1. [Structure] Resolver logic sits in `src/components/landing/data.ts`**
- The plan's acceptance wants `taxonomy()` and a `shortcut:` comment literally in `[slug]/page.tsx`. Both landing routes need the same lookup, so it is one cached `resolveLanding(slug, model?)`; `[slug]/page.tsx` calls it before `getBySlug` and says so in a comment. The `shortcut:` comment is in `data.ts`. Same behaviour, one copy of the logic.

**2. [Interface] `Landing` carries slugs as well as labels** (plus `landingPath` and `landingFilter` helpers in `landing.ts`) so metadata, sitemap and links need no second lookup.

**3. [Scope] Pre-PR gate not run here.** This run was told not to push or open a PR, so the ponytail audit, rebase onto `origin/main`, push and the #8 PR (which waits on the #6 PR merging) are left to the caller.

No Rule 1 to 3 fixes were needed.

## Known limits

- The "See all {n} {name}" button (more than 12 cars) is not exercised by the demo data (largest make has 6); the E2E branch asserts it when `n > 12`.
- Chips and the grid come from one `pageSize: 1000` query (`shortcut:` in `data.ts`); a live provider should ask for counts and price range instead.

## Known Stubs

None.

## Threat Flags

None. New routes take only `params.slug` and `params.model`, compared against `taxonomy()` before anything renders; JSON-LD goes through `JsonLd`.

## Self-Check: PASSED

Files exist (landing.ts, landing.test.ts, data.ts, LandingPage.tsx, `[model]/page.tsx`, landing.spec.ts) and commits 10596da, 38ecd98, 84e2759 are on the branch.
