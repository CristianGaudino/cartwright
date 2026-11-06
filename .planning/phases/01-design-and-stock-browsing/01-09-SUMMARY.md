---
phase: 01-design-and-stock-browsing
plan: 09
subsystem: stock-page
tags: [stock-page, loading-state, empty-state, error-state, e2e-switch]

requires:
  - phase: 01-05
    provides: "StockShell, StockResults, the stock page, the sort E2E with the skeleton sampler"
provides:
  - "StockError and EmptyState exported from src/components/stock/StockShell.tsx (01-06 and 01-08 reuse them)"
  - "E2E failure switch in stock.query: rejects when the server env var E2E_FAIL_QUERY equals the search; only playwright.config.ts sets it"
  - "src/app/used-cars/(browse)/loading.tsx: 6 static skeleton cards, with loading.test.ts"
  - "Past-the-end redirect to the last page in the stock page"
  - "CI worker check that the failure switch is off on the Worker build"
affects: [01-06, 01-08]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 7cf836f1a49f2ab0e4ae623c292fb87829d861c1
plan_head_after: 12be498005fd4e40c013be28238fa73f796f7355

tech-stack:
  added: []
  patterns: ["provider failure caught in the page (no error.tsx) so Sort and later filters stay mounted", "env-var switch read per call inside the provider, set only by the local Playwright webServer"]

key-files:
  created:
    - "src/app/used-cars/(browse)/loading.tsx"
    - "src/app/used-cars/(browse)/loading.test.ts"
  modified:
    - src/lib/stock/index.ts
    - playwright.config.ts
    - "src/app/used-cars/(browse)/page.tsx"
    - src/components/stock/StockShell.tsx
    - src/components/stock/StockResults.tsx
    - e2e/stock.spec.ts
    - e2e/carousel.spec.ts
    - .github/workflows/ci.yml

key-decisions:
  - "The provider failure is caught with .catch(() => null) on stock.query rather than a try block: same behaviour, nothing logged, and the redirect below it sits outside any catch"
  - "Skeleton and states share the py-16 (64px) empty-state padding from the UI-SPEC and the accent button style (h-12, white on accent, press scale 0.97 off under reduced motion)"

requirements-completed: [DES-01, BRW-03]

duration: 25min
completed: 2026-11-06
status: complete
---

# Phase 1 Plan 09: Edge states for the stock page Summary

**The stock page now has its three edge states: a provider failure shows "We could not load the cars" with Sort still usable (tested on the production build through a local-only env switch that CI proves is off on the Worker), zero matches show "No cars match these filters" with Clear all filters, and a page past the end redirects to the last page; first load streams six static skeleton cards.**

## Accomplishments
- `stock.query` in `src/lib/stock/index.ts` rejects only when `process.env.E2E_FAIL_QUERY` is non-empty and equals `query.q`; read inside the call. `playwright.config.ts` sets it to `e2e-forced-failure` for the server it starts. The name appears nowhere in `wrangler.jsonc`, `next.config.ts` or any workflow.
- The stock page catches a provider failure, logs nothing, passes `summary` null and renders `<StockError />` (heading, body, accent "Try loading cars again" running `router.refresh()` in its own transition). No `error.tsx`, so the page answers 200, the count is empty and Sort stays enabled.
- `EmptyState` (heading, body, "Clear all filters" via `navigate(clearFilters(query))`) replaces the grid and pagination when `result.total === 0`.
- `redirect(stockHref({ ...query, page: result.pageCount }))` outside the catch when `query.page > pageCount`; the target is the constant `/used-cars` path plus serialised params (T-01-14).
- `(browse)/loading.tsx`: h1, a spacer for the count and Sort rows, six `data-skeleton` cards with the same `aspect-[4/3] bg-photo-bg` box and text block heights as a real card, no `animate-` class. The car route sits outside the group, so `/used-cars/not-a-car` is still a real 404 (E2E passes).
- CI worker job requests `/used-cars?q=e2e-forced-failure` on the Worker build and sets `fail=1` unless it answers 200 without the error copy.

## Task Commits
1. Task 1 (tracer): `a3c864e` feat(01-09): a provider failure shows the error state with Sort still usable
2. Task 2: `12be498` feat(01-09): first-load skeleton, zero-match state and past-the-end redirect

The tracer was verified end to end (build plus the full stock spec, 12 passed with the failure test running, not skipped) before task 2 started.

## Verification (by exit code)
- `npm run typecheck`: 0. `npm run lint`: 0. `npm test`: 0 (116 tests, including the 2 new skeleton tests; RED seen first because `./loading` did not exist).
- `npm run build`: 0. `npx playwright test` (all specs on the production build, no `E2E_BASE_URL`): 24 passed, 0 skipped. Stock and carousel specs repeated 3 times (66 passed) to check the sampler tests are not flaky.
- Acceptance greps: switch name absent from `wrangler.jsonc`, `next.config.ts` and workflows; `e2e-forced-failure` and the error copy in `ci.yml` with `fail=1` in the same block; no `error.tsx`; no `console.` in the three paths; no `loading.tsx` above or beside the car route; no em dash in site copy (the only hit in `src/lib` is the `demo-cars.test.ts` regex noted in 01-05).
- Not run: the Worker build itself (`opennextjs-cloudflare build` and the new curl check); CI runs it on the PR. The human check (Slow 4G on a phone) is not done.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] E2E tests broke on the first-load skeleton lingering after `load`**
- **Found during:** Task 2
- **Issue:** React holds a streamed Suspense fallback for about 250 to 300 ms after the content has arrived (measured with a probe: skeleton present at 250 ms after `load`, 12 cards from 292 ms). The 01-05 sort test sampled `[data-skeleton]` right after `load` and saw it; the 01-07 blocked-photo test took the hidden streamed card's bounding box (null).
- **Fix:** the sort test now waits for the skeleton to leave before it installs the sampler (the assertion that a sort change never shows it is unchanged); the carousel test waits for its card to be visible. The page needed no change: the sort change itself never shows the skeleton, so fix steps 1 to 3 in the plan were not needed.
- **Files modified:** `e2e/stock.spec.ts`, `e2e/carousel.spec.ts` (a 01-07 file, one line, outside the plan's file list)
- **Commit:** 12be498

**2. [Form only] `.catch` instead of a `try` block**
- The acceptance line says the page "contains `try`". It uses `stock.query(query).catch(() => null)`, which behaves the same and keeps `redirect` out of any catch. `StockError` and the missing `error.tsx` are as specified.

**Total deviations:** 1 auto-fixed (Rule 1), 1 form-only. **Impact:** none on scope.

## Decision for the owner
`loading.tsx` costs about 300 ms on every first load of /used-cars with this in-memory provider: the data is ready at once, but React keeps the skeleton up for its reveal throttle. The plan chose this on purpose (UI-SPEC loading row), and it will matter little once the Carsie provider has real latency, but on a mid-range phone it delays the first cars. If that is unwanted, delete `(browse)/loading.tsx` and its test; nothing else depends on it. Worth timing in the Slow 4G human check.

## Known Stubs
None.

## Threat Flags
None. T-01-14 (redirect target built from parsed params only), T-01-26 (switch absent outside the local server, CI check on the Worker) and T-01-29 (nothing logged) are mitigated as planned. The PR for #4 must still state that `E2E_FAIL_QUERY` is absent from the Cloudflare vars and secrets; only the owner can see the dashboard.

## Self-Check: PASSED
Files exist: `loading.tsx`, `loading.test.ts`, this summary. Commits a3c864e and 12be498 are on `feat/phase-1-stock-browsing`.
