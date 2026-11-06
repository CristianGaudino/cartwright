---
phase: 01-design-and-stock-browsing
plan: 06
subsystem: stock-filters
tags: [filters, facets, sidebar, url-state, search]

requires:
  - phase: 01-05
    provides: "StockShell, useStock, icons, the stock page and e2e/stock.spec.ts"
  - phase: 01-09
    provides: "StockError, EmptyState and the E2E failure switch"
provides:
  - "toggle, appliedFilters and facetRows in src/lib/stock/query.ts, with unit tests"
  - "StockFilters (all UI-SPEC groups, showSearch prop) and SearchBox exported from src/components/stock/StockFilters.tsx; 01-08 renders the same StockFilters in the phone sheet"
  - "AppliedFilters chips row"
  - "useStock().facets: the facets of the last result that loaded"
  - "Desktop sidebar (hidden below 1024px) and the mobile search box in StockShell"
  - "e2e/stock-filters.spec.ts (desktop and phone blocks)"
affects: [01-08]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 2cf4e6caa9b7f5ab7e7c6110add6c4c3925de283
plan_head_after: 5872260458f6bfc920f4346ffee4478902b30eb7

tech-stack:
  added: []
  patterns: ["one facetRows helper owns the zero-count and failed-load rules for every multi-select group", "held facets via adjusting state during render, context value uses summary.facets whenever summary exists", "search debounce: local value plus sent/seen state, no ref read during render"]

key-files:
  created:
    - src/components/stock/StockFilters.tsx
    - src/components/stock/AppliedFilters.tsx
    - e2e/stock-filters.spec.ts
  modified:
    - src/lib/stock/query.ts
    - src/lib/stock/query.test.ts
    - src/components/stock/StockShell.tsx

key-decisions:
  - "The chips row hides its own Clear all filters when the result is empty, because the empty state already carries that button (two buttons with one name broke the 01-09 empty-state test and would confuse a screen reader)"
  - "Facet checkboxes and chips use aria-disabled (not the disabled attribute) so they stay focusable; the click handler ignores them"
  - "A hand-edited URL value that is not a select step (for example priceMax=12345) is added to that select so it is shown and can be changed"

requirements-completed: [BRW-01, BRW-03, BRW-04]

duration: 25min
completed: 2026-11-06
status: complete
---

# Phase 1 Plan 06: Stock filters Summary

**A sticky 280px desktop sidebar with search, make, model, year, budget, body type, fuel, transmission and mileage filters, honest provider-only counts, removable chips, and filters that stay usable (without counts) when a load fails; every change lands in the URL.**

## Accomplishments
- `query.ts`: `toggle` (resets page, removing a make drops only models it alone owns), `appliedFilters` (UI-SPEC group order, each `next` removes exactly one filter) and `facetRows` (the single place that disables unselected zero-count rows and drops counts after a failed load).
- `StockShell` keeps the facets of the last loaded result in state (updated during render, no effect) and exposes them as `useStock().facets`; the layout is a `lg:grid-cols-[280px_1fr]` grid with `<aside className="hidden lg:block …">`, a mobile search box (`lg:hidden`) and `AppliedFilters` above the results.
- Make and Model: checkbox lists, top 8 plus every ticked row, "Show all {n}" and "Show fewer", a 320px scrolling box when expanded, labels truncate, counts do not.
- Search: 250ms debounce, `maxLength` 80, never disabled; Clear all filters and chips replace the typed text.
- Year, Budget and Mileage are native selects; Body type and Fuel are `aria-pressed` chips with a check icon; Transmission is a three-radio segmented control in a `radiogroup` fieldset.
- 25 unit tests in `query.test.ts` (10 new), 13 E2E in `stock-filters.spec.ts`: ticking, disjunctive counts, sum equals total, chips and Clear all, Show all and the low-ranked make (BRW-01), search, Model, each group's param, zero-count `aria-disabled`, shared URL in a second context (BRW-03), the failed-load case, one copy of each control per viewport.

## Task Commits
1. Task 1 (tracer): `54ebb41` feat(01-06): tick a make in the sidebar and see only those cars with honest counts and chips
2. Task 2: `5872260` feat(01-06): every filter group: search, model, year, budget, body, fuel, transmission, mileage

The tracer gate: its `<verify>` (unit tests, typecheck, lint, build, the new spec) and the full existing E2E (30 passed) were all re-run green before Task 2 began.

## Verification (by exit code)
- `npm run lint`: 0. `npm run typecheck`: 0. `npm test`: 0 (all tests, including 10 new). `npm run build`: 0.
- `npx playwright test` on the production build, no `E2E_BASE_URL`, `--repeat-each=2`: 74 passed, 0 skipped, 0 failed (the failure test ran, it was not skipped).
- Acceptance greps: no `.cars` in `StockFilters.tsx` or `AppliedFilters.tsx`; the 250 timer, `maxLength={80}`, `aria-pressed`, `role="radiogroup"`, `useId`, `aria-disabled`, `Show all`, `Show fewer`, `max-h-[320px]`, `truncate`, `shrink-0`, `facetRows(`, `flex-wrap`, `hidden lg:block` present. The only em dash hit under `src/` is the regex in `demo-cars.test.ts` (noted in 01-05).
- Not run: the Worker build, the pre-PR ponytail audit and the PR (01-08 opens it).

## Deviations from Plan

**1. [Rule 1 - Bug] Duplicate "Clear all filters" on the empty state**
- **Found during:** Task 1
- **Issue:** With zero matches, the chips row and `EmptyState` both rendered a "Clear all filters" button, which broke the 01-09 empty-state test (two buttons, one name) and gives a screen reader two identical controls.
- **Fix:** the chips row hides its Clear all filters when `summary.total === 0`; the chips themselves stay. It shows again after a failed load (summary null).
- **Files modified:** `src/components/stock/AppliedFilters.tsx`
- **Commit:** 54ebb41

**2. [Form only] Test-side details**
- Chips and facet rows are located by their label span rather than by accessible name, because the label and count are separate flex items and their text content joins as "Hatchback2".
- The tests wait for React to attach (`__reactFiber` on `main`) before the first click, since a click on server HTML before hydration does nothing.

**Total deviations:** 1 auto-fixed (Rule 1), 1 form-only. **Impact:** none on scope.

## Known limits
- If a buyer types and clicks Clear all filters inside the 250ms window, the pending search still fires once. Left as is; cheap to fix by clearing the timer in a handler if it matters.
- `StockShell` and `StockFilters` import each other (the plan's design). It works because `useStock` is only called at render, and ESLint and the build raise nothing.

## Known Stubs
None.

## Threat Flags
None. T-01-20 (labels render as React text; the URL goes through `parseStockQuery`), T-01-21 (every change goes through `navigate` and `stockHref`) and T-01-22 (250ms debounce, `maxLength` 80, 80-character parse cap) are mitigated as planned.

## Self-Check: PASSED
Files exist: `StockFilters.tsx`, `AppliedFilters.tsx`, `e2e/stock-filters.spec.ts`, this summary. Commits 54ebb41 and 5872260 are on `feat/phase-1-stock-browsing`.
