---
phase: 01-design-and-stock-browsing
plan: 08
subsystem: stock-filter-sheet
tags: [filters, dialog, bottom-sheet, motion]

requires:
  - phase: 01-06
    provides: "StockFilters (showSearch prop), useStock, appliedFilters, clearFilters"
provides:
  - "FilterSheet: Filters button with applied-count badge and a native dialog bottom sheet holding StockFilters"
  - "Sheet layout, motion and preference styles in globals.css"
  - "Phone block of e2e/stock-filters.spec.ts (sheet, badge, counts, close paths, failure label, one copy per viewport, motion, 320px)"
affects: []

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: e4909232fddd47e6d201182a4935630886dea1a8
plan_head_after: 09377aaeea47279236d2ca1a4c2feb078533c85d

tech-stack:
  added: []
  patterns: ["native dialog + @starting-style + allow-discrete for enter and exit, transitions not keyframes so a reversal follows from the current position", "reduced motion swaps transform for a 150ms opacity cross-fade in a media block"]

key-files:
  created:
    - src/components/stock/FilterSheet.tsx
  modified:
    - src/components/stock/StockShell.tsx
    - src/app/globals.css
    - e2e/stock-filters.spec.ts

key-decisions:
  - "The primary button reads summary.total (provider total) and is only replaced when a new result lands, so it keeps the last known count while pending with no extra state"
  - "Below 640px the Sort label is visually hidden (still its accessible name) so Filters and Sort fit on one row at 320px"

requirements-completed: [BRW-01, BRW-04]

duration: 40min
completed: 2026-11-06
status: complete
---

# Phase 1 Plan 08: Filter sheet Summary

**A phone Filters button with an applied-count badge opens a native dialog bottom sheet holding the same StockFilters; every change applies through the URL, the pinned button says "Show n cars" from the provider total, and the sheet slides on transform over 320ms (150ms cross-fade with reduced motion).**

## Accomplishments
- `FilterSheet`: `showModal()` on `dialog.sheet`, header with "Filters" and an icon-only "Close filters", a scrolling body with `<StockFilters showSearch={false} />`, a pinned footer with "Clear all filters" (only when filters apply) and the primary button ("Show n cars", "Show 1 car", disabled "No cars match", "Show cars" after a failed load, `aria-busy` while pending). Closes on the primary button, the close icon, a click on the scrim (target is the dialog) and Escape; the `close` handler puts focus back on Filters.
- `globals.css`: bottom-docked sheet, `max-height: 90dvh`, page scroll lock via `body:has(dialog.sheet[open])`, `@starting-style` slide and scrim fade (320ms, `--ease-sheet`, `overlay` and `display` with `allow-discrete`), reduced motion (opacity 150ms, no transform), reduced transparency (solid, no blur) and more contrast (1px text border).
- One instance per viewport: the dialog sits in the `lg:hidden` sticky bar, closed it renders nothing, so the sidebar is the only copy from 1024px and the sheet the only copy below it. The 01-06 known risk (a second visible StockFilters) does not occur: role-based locators found exactly one Make group in each state.
- The ticked-but-low-ranked make rule from 01-06 holds in the sheet without tapping Show all (tested).
- Drag to dismiss is not built (optional in the UI-SPEC).

## Task Commits
1. Task 1 (tracer): `2518f38` feat(01-08): on a phone, open Filters, tick a make, see Show n cars, close and land back on Filters
2. Task 2: `09377aa` feat(01-08): sheet motion and preferences, failure label, one copy of each control per viewport

Tracer gate: typecheck, lint, build and the stock-filters spec (17 passed) were re-run green before Task 2.

## Verification (by exit code)
- `npm run lint`: 0. `npx tsc --noEmit` and `npm run typecheck`: 0. `npm test`: 0. `npm run build`: 0.
- Full E2E on the production build with the failure switch on: 48 passed, 0 skipped, 0 failed (smoke, stock, carousel, stock-filters), 4 workers.
- No em dash under `src/components` or `src/app`.
- Not run: the Worker build, the ponytail audit, the PR and the project-board move (the orchestrator handles those; the plan's pre-PR steps were skipped as instructed). The motion human-check (device mode, Pixel 7, reduced motion on and off) is still for the owner.

## Deviations from Plan

**1. [Rule 1 - Bug] Filters button and Sort overflowed the sticky bar at 320px (scrollWidth 333)**
- **Found during:** Task 2 (320px check)
- **Issue:** The Sort select is as wide as its longest option, so Filters plus Sort did not fit in 288px, and would not fit at 360px either.
- **Fix:** In `StockShell.tsx`, `SortControl` lets the wrapper and select shrink (`min-w-0`, `w-full`, `truncate`) and hides the "Sort" label visually below 640px (`sr-only sm:not-sr-only`; still the accessible name, so existing role locators work). Desktop is unchanged.
- **Files modified:** `src/components/stock/StockShell.tsx` (not in the plan's Task 2 file list)
- **Commit:** 09377aa

**2. [Form only] Test-side details**
- The primary button locator is `/^(Show \d+ cars?|Show cars|No cars match)$/`, because `/^Show/` also matched the Make group's "Show all N" button.
- Geometry is measured after `getAnimations()` finish, since the sheet is mid-slide for 320ms.
- The sheet is located as `getByRole("dialog", { name: "Filters" })` and the trigger as `/^Filters/` (the badge adds its number to the name).

**3. [Environment] Port 3000 was held by another repo's server**
- A `next start -p 3000` from `C:\Git\vintage` was listening, so `npm run e2e` reused it and failed. I did not touch it. The full run used an untracked temporary config (deleted afterwards) that starts this repo's server on port 3200 with `E2E_FAIL_QUERY` set. The committed `playwright.config.ts` is unchanged.

**Total deviations:** 1 auto-fixed (Rule 1), 2 form or environment. **Impact:** one small edit to `SortControl` outside the planned file list.

## Known limits
- At 320px the long sort option "Mileage: lowest first" is cut with an ellipsis in the closed select.
- The badge counts every applied filter chip, including a typed search, as `appliedFilters` does.
- The scrim stays translucent under reduced transparency (it is a dimmer); the sheet itself is solid.

## Known Stubs
None.

## Threat Flags
None. T-01-27 (badge is `appliedFilters(...).length`, button reads `summary.total`, both React text, E2E compares the button to the count label) and T-01-28 (scroll lock is CSS on the open attribute, native focus trap and Escape, `close` refocuses Filters, focus checked after each close path) are mitigated as planned.

## Self-Check: PASSED
Files exist: `src/components/stock/FilterSheet.tsx`, this summary. Commits 2518f38 and 09377aa are on `feat/phase-1-stock-browsing`.
