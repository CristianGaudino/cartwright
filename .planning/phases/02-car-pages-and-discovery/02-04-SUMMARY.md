---
phase: 02-car-pages-and-discovery
plan: 04
subsystem: car-page
tags: [car-page, json-ld, metadata, sold, next16]
requires: ["02-02", "02-06"]
provides:
  - "Car page with buy box, reserved 104px action area, sold banner"
  - "specRows, keyFacts in format.ts; carMetadata, carDescription, carJsonLd in seo.ts; JsonLd component"
  - "resolveSlug (React cache) in the car route, ready for 02-07 to add make and body kinds"
affects: [02-05, 02-07, 02-08]
tech-stack:
  added: []
  patterns: ["server components only on the car page (no Car object reaches a client component)", "native details for Show all / Show fewer", "JsonLd as the single raw-HTML file"]
key-files:
  created:
    - src/components/car/BuyBox.tsx
    - src/components/car/CarSections.tsx
    - src/components/JsonLd.tsx
    - src/lib/stock/seo.ts
    - src/lib/stock/seo.test.ts
    - e2e/car-page.spec.ts
  modified:
    - src/app/used-cars/[slug]/page.tsx
    - src/components/stock/icons.tsx
    - src/lib/stock/format.ts
    - src/lib/stock/format.test.ts
    - e2e/stock.spec.ts
key-decisions:
  - "keyFacts is the first four rows of specRows among Year, Mileage, Fuel, Transmission, Body type, Engine, Colour: spec order is the priority order, one builder for both"
  - "NCT month uses a fixed month-name list, not Intl, so the Worker and Node print the same text"
  - "Similar cars: two stock.query calls (make, then body type), page size 6 each, de-duplicated by id, first 3"
  - "JSON-LD optional fields are left undefined and dropped by JSON.stringify; tests assert on the parsed output"
requirements-completed: [CAR-01, CAR-03, CAR-07]
status: complete
duration: ~40 min
completed: 2026-11-06
actuals:
  tokens: 40000
  tasks: 3
  commits: 3
plan_head_before: 9503f0a863093077cbc68d22226d3b4a7614eeb4
plan_head_after: 8a1e8be29d3cf87bf0c13b03fdf8f229680bef81
---

# Phase 2 Plan 04: Car page, sold state, sections and JSON-LD Summary

The car page now shows photo, title, price, key facts and a Call now button (`tel:+353831333154`) in a 104px reserved action area; a sold car shows a Sold badge and banner with no price, no date and a See more {Make} button; below sit About this car, Specifications, Equipment (12 plus native Show all) and up to 3 Similar cars; every page carries a canonical URL and Product plus Car JSON-LD (SoldOut and price-less for sold cars).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: buy box, key facts, Call now, sold state | a133121 |
| 2 | About, Specifications, Equipment, Similar cars | ceed123 |
| 3 | Canonical metadata and JSON-LD | 8a1e8be |

Tracer gate: Task 1's `<verify>` (typecheck, lint, build, car-page and stock E2E) was re-run end to end and passed before expanding.

## Verification (all by exit code)

- `npm test`: 232 passed. `npm run typecheck` (next typegen + tsc): 0. `npm run lint`: 0. `npm run build`: 0, prints `ƒ /used-cars/[slug]` (dynamic).
- Full Playwright suite on `PORT=3114` against a production build: 79 passed (car-page 11, plus the existing stock, filters, sold, carousel, indexing and smoke specs).
- `grep dangerouslySetInnerHTML src` lists only `src/components/JsonLd.tsx`; no `soldAt` or `Sold on` in any `.tsx`; no em dash and no "Carright" in the new source files; no `loading.tsx` under the route.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing stock E2E price check became ambiguous**
- **Found during:** Task 3 (full suite run)
- **Issue:** `e2e/stock.spec.ts` "a car page shows title, price and a way back" used `page.getByText(/^€[\d,]+$/)`, which now also matches the prices on the Similar cars cards (strict mode violation).
- **Fix:** scoped the locator to `getByTestId("buy-box")`.
- **Files modified:** e2e/stock.spec.ts
- **Commit:** 8a1e8be

### Other notes

- `specRows` (Task 2's function) is implemented in Task 1's commit because `keyFacts` is built on it; its unit tests landed in Task 2, so Task 2's tests did not start red.
- Added one desktop E2E (buy box 360px, right of the photo, number under Call now, min-height 0) that the plan did not list, to cover the lg grid layout.
- The `ponytail-audit` required by CLAUDE.md before a PR was not run here; it belongs to the orchestrator before the #6 PR.

## Data note for the owner and later plans

About 6 demo cars (e.g. 4396311, 4520171, 4381995, 4474493, 4401031, 4390543) have a description that is a short word followed by an equipment list as a comma-separated line (from 02-01's parser). The plan renders the description as published, so About this car shows that text as is. Not trimmed; fixing it belongs in the demo-stock parser (split the line into `features`), or a render-time rule if the owner prefers. Some descriptions also contain the dealer's own "Carright" wording and lines ending in commas; left as published.

## Known Stubs

None. The gallery slot shows the first photo only, by design: plan 02-05 swaps in the full gallery. "See more {Make}" and "See all {Make}" link to `/used-cars/{makeSlug}`, which 404s until plan 02-07 (#8) adds make pages (the #6 PR should say so).

## Threat Flags

None beyond the plan's register. T-02-14 (escape `<`, single raw-HTML file, unit test), T-02-15 (components use `isSold` only, server components only, raw HTML E2E check, JSON-LD test), T-02-16 (`DEALER_TEL`), T-02-17 (exact slug lookup, real 404) are implemented.

## Self-Check: PASSED

- Commits a133121, ceed123, 8a1e8be exist on the branch.
- Created files exist: BuyBox.tsx, CarSections.tsx, JsonLd.tsx, seo.ts, seo.test.ts, car-page.spec.ts.
