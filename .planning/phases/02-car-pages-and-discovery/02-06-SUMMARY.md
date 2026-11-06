---
phase: 02-car-pages-and-discovery
plan: 06
subsystem: stock-page
tags: [stock-page, sold, carousel, url-state]
requires: ["02-01"]
provides:
  - "sold=1 URL param (parse, serialise, Sold cars included chip)"
  - "Include sold cars checkbox in the shared StockFilters (sidebar and sheet)"
  - "SoldBadge, the shared Sold pill (for 02-04, 02-05, 02-07)"
  - "Sold card state: plain word Sold in the price slot, hidden badge on the photo"
  - "See all {n} photos tile as the last slide of every card carousel with 2+ photos"
affects: [02-04, 02-05, 02-07]
tech-stack:
  added: []
  patterns: ["sold state read only through isSold(car), never the sale date", "tile is slide index n; dots and Photo i of n count photos only"]
key-files:
  created:
    - src/components/stock/SoldBadge.tsx
    - src/components/stock/ListingCard.test.ts
    - e2e/sold.spec.ts
  modified:
    - src/lib/stock/query.ts
    - src/lib/stock/query.test.ts
    - src/components/stock/StockFilters.tsx
    - src/components/stock/ListingCard.tsx
    - src/components/stock/PhotoCarousel.tsx
    - src/components/stock/PhotoCarousel.test.ts
    - e2e/carousel.spec.ts
key-decisions:
  - "Price slot on a sold card reads Sold, no date anywhere (owner instruction 2026-11-06)"
  - "On a card the photo badge is aria-hidden so Sold is announced once, by the price slot"
  - "No tile on single-photo cards"
requirements-completed: [CAR-07]
status: complete
duration: ~30 min
completed: 2026-11-06
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 81c402d3839864d784fd353c47410b142036c675
plan_head_after: 00faba42fa5b594ac072dec5f07b10a0897d7798
---

# Phase 2 Plan 06: Sold cars and the See all photos tile Summary

The stock page now has an Include sold cars toggle that writes `sold=1` and shows a chip, sold cards read the plain word Sold with a shared off-white badge on the photo, and every multi-photo card carousel ends with a keyboard-reachable See all {n} photos tile.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: Include sold cars from checkbox to URL to sold cards listed last | 586c97b |
| 2 | The shared Sold badge on the card photo | ef07ca9 |
| 3 | The See all photos tile at the end of every card carousel | 00faba4 |

Tracer gate: Task 1 `<verify>` (query tests, tsc, lint, build, `sold.spec.ts` + `stock-filters.spec.ts`: 35 passed, none skipped) re-run end to end before Task 2, passed.

## What changed

- `query.ts`: `sold` parses only from the exact value `1` (to `"include"`); `"only"` is never read from or written to a URL. It sits after `kmMax`, before `sort`. The `Sold cars included` chip comes after Mileage and its `next` drops `sold` and resets the page, so the Filters badge and the chips pick it up with no edit to `FilterSheet` or `AppliedFilters`. `clearFilters` already drops it.
- `StockFilters.tsx`: one checkbox row after Mileage, hairline above, same checkbox markup as Make, no count.
- `SoldBadge.tsx`: server component, `bg-text` pill with `text-ink`, 28px high, `hidden` sets `aria-hidden`.
- `ListingCard.tsx`: sold cars get the hidden badge at top-left (z-20, above the carousel) and `Sold` in `text-text-2` in the same Heading line. No opacity or filter classes.
- `PhotoCarousel.tsx`: with 2+ photos a final slide (`role=group`, `aria-roledescription=slide`, `aria-label="See all {n} photos"`) holds a full-tile link to the card href (a 44px off-white circle with a chevron, then the text). The tile is index `n`, so `atEnd` is true only there and no dot is active on it.

## Verification

- `npm test` 218 passed (exit 0); `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0.
- Full Playwright suite against the production build: 64 passed, none skipped (PORT=3107).
- `grep -rln "soldAt" src/app src/components` (non-test) prints nothing. Em dash grep over `src/app src/components src/lib` (non-test) finds nothing. No `grayscale` or `opacity-` in `ListingCard.tsx`.
- `ListingCard.test.ts` asserts the fixture sale date string, any month name and any euro sign are absent from a sold card's markup.

## Deviations from Plan

None to the code scope. Notes:

1. **TDD order (Task 2, Task 3):** the badge and tile components were written before their render tests, so the tests passed on first run rather than failing first. The behaviours are still pinned by the tests.
2. **Existing carousel keyboard E2E updated (Task 3):** the old test assumed the last photo is the end. It now takes one extra press to reach the tile, expects no active dot there, and walks Previous back through all n photos. This is the update the plan asked for.
3. **Tab-order check:** the tile link comes before the arrows and the title link in the DOM, so the E2E reaches it with three Shift+Tab presses from the card title (Next, Previous, tile link).
4. **Worktree base:** HEAD was 4f1f0e2, not the requested 81c402d; the worktree was clean, so `git reset --hard 81c402d` was run as instructed. `npm ci` and `next typegen` were run first. `.stock-cache` was not needed (no stock rebuild).
5. **Branch:** commits are on the worktree branch `worktree-agent-ac07f21b91fe3160f`, not `feat/car-pages`; the orchestrator owns the PR branch.
6. **Plan commit ledger file** (protocol 0c) was not written to the git dir (the sandbox refused the compound git command); the base SHA is recorded above and `commits: 3` was measured with `git rev-list --count 81c402d..HEAD`.

## Notes for later plans

- Sold fixtures on the stock page sort last, so with the full stock the sold cars sit on the final page; E2E picks a make that has both kinds (`mixedMake`, Ford or Volkswagen today) and skips with the "run npm run stock:build" message when no demo car is in the sold window.
- The sold price slot is `p.text-heading` inside `article > div:last-child`; the existing price helpers in `stock-filters.spec.ts` read it as 0 for a sold card, which only matters when `sold=1` is on.

## Known Stubs

None.

## Threat Flags

None. T-02-12 (only `sold=1` accepted, `"only"` never parsed, unit-tested) and T-02-13 (no component reads the sale date; `ListingCard.test.ts` asserts it is absent; `PhotoCarousel` still receives only photos, href, label and priority) are mitigated.

## Self-Check: PASSED

- Commits 586c97b, ef07ca9, 00faba4 exist on the branch.
- Created files exist: SoldBadge.tsx, ListingCard.test.ts, sold.spec.ts.
