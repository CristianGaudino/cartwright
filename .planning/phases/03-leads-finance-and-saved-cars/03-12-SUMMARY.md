---
phase: 03-leads-finance-and-saved-cars
plan: 12
subsystem: navigation
status: complete
tags: [links, header, footer, empty-state, tracer]
requires:
  - "03-11: /find-a-car and /sell-your-car"
provides:
  - "Header links Sell your car and Find a car from 1024px"
  - "Footer links in UI-SPEC order (Used cars, Sell your car, Find a car, Privacy policy)"
  - "Both pages in the sitemap and the CI worker checks"
  - "Find-a-car link in the stock empty state and, replacing See all used cars, in the empty landing page"
affects: [03-14, 03-15, 03-16, "#48 saved cars (header Saved link and footer Saved cars link on rebase)"]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified: [src/components/SiteHeader.tsx, src/components/SiteFooter.tsx, src/app/sitemap.ts, .github/workflows/ci.yml, src/components/stock/StockShell.tsx, src/components/landing/LandingPage.tsx, e2e/sourcing.spec.ts, e2e/landing.spec.ts, e2e/stock.spec.ts]
decisions:
  - "Finance and Saved links are not added: /finance does not exist yet (03-15/16) and Saved is on the unmerged #48 branch"
  - "The find-a-car link is written inline in both empty states (same copy and classes), not a shared component"
metrics:
  duration: 20m
  completed: 2026-11-07
estimate:
  tokens: 35000
actuals:
  tokens: 2300
  tasks: 2
  commits: 2
plan_head_before: cda5eb67acf958d1945b40a35bca5857d1afa30a
plan_head_after: ac0ae189ac13bf8c5671d999d9ae5dc6d5d3c331
---

# Phase 3 Plan 12: Links to the form pages Summary

Both form pages can be reached from every page and every empty result: the header from 1024px, the footer at every width, the sitemap, the stock empty state, and the empty landing page, where the find-a-car link has replaced the See all used cars button (D-15).

## What was built

- **SiteHeader:** the nav is a 24px-gap row: `Used cars` always, `Sell your car` and `Find a car` from 1024px (`hidden lg:inline`).
- **SiteFooter:** `Used cars`, `Sell your car`, `Find a car`, `Privacy policy`.
- **Sitemap:** `/sell-your-car` and `/find-a-car` (production only, like the rest). **CI worker job:** `"/sell-your-car 200"` and `"/find-a-car 200"`.
- **Stock empty state:** under `Try removing a filter.`, a centred text link `Cannot find it? Ask us to find it for you.` (body colour, underlined, 44px). `Clear all filters` stays.
- **Landing empty branch:** the accent `See all used cars` link is gone; the same find-a-car link sits in its place with `mt-8`. The breadcrumb and the in-stock branch are unchanged.

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck`, `npx tsc --noEmit`, `npm run lint` | exit 0 |
| `npm test` | exit 0, 17 files, 326 tests |
| `APP_ENV=production NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` | exit 0 |
| `APP_ENV=production PORT=3177 npx playwright test` (whole suite, covers both plans) | **134 passed**, none skipped |
| `grep -c "See all used cars" src/components/landing/LandingPage.tsx` | 0 |

Tracer gate (Task 1): `sourcing.spec.ts` and `smoke.spec.ts` passed (6) before Task 2 started.

## Deviations from Plan

None. The header has no Saved link to keep because #48 (saved cars) is not merged into this branch's base; that branch adds it, and the footer `Saved cars` link, when it rebases.

## Known Stubs

None.

## Threat Flags

None. T-03-46: only the two public form pages were added to the sitemap.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 6fd04cb | SiteHeader, SiteFooter, sitemap, ci.yml, sourcing spec |
| 2 | ac0ae18 | StockShell, LandingPage, landing spec, stock spec |

## Self-Check: PASSED

- FOUND: `/sell-your-car` and `/find-a-car` in SiteHeader.tsx, SiteFooter.tsx and sitemap.ts; `/sell-your-car 200` and `/find-a-car 200` in ci.yml
- FOUND: `Cannot find it? Ask us to find it for you.` and `/find-a-car` in StockShell.tsx and LandingPage.tsx
- FOUND: landing.spec asserts the find-a-car href and a `See all used cars` count of 0
- FOUND: commits 6fd04cb, ac0ae18 in HEAD
