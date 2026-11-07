---
phase: 03-leads-finance-and-saved-cars
plan: 03
subsystem: saved-cars
status: complete
tags: [saved-cars, localstorage, useSyncExternalStore, header, tracer]
requires: ["03-01"]
provides:
  - "src/lib/saved/store.ts: SAVED_KEY, MAX_SAVED, parseIds, useSavedIds, setSavedIds, toggleSaved, subscribe"
  - "SaveButton (card and page variants), SavedLink, HeartIcon"
  - "Heart on every ListingCard; Saved link with count in SiteHeader"
affects: [03-07]
tech-stack:
  added: []
  patterns: ["useSyncExternalStore over the raw stored string, parsed in useMemo", "in-memory fallback once a storage write fails", "per-button sr-only polite live region"]
key-files:
  created: [src/lib/saved/store.ts, src/lib/saved/store.test.ts, src/components/saved/SaveButton.tsx, src/components/saved/SavedLink.tsx, e2e/saved.spec.ts]
  modified: [src/components/stock/ListingCard.tsx, src/components/SiteHeader.tsx, src/components/stock/icons.tsx, e2e/carousel.spec.ts]
decisions:
  - "Storage key is cartwright:saved-ids as the plan's interface says (research suggested cartwright:saved:v1)"
  - "subscribe is exported as well, so the unit test can check own-tab and cross-tab notifications without rendering React"
  - "Once a write throws, the page reads from memory until a write succeeds again, so a quota error does not leave the heart stuck on the old stored value"
metrics:
  duration: 25m
  completed: 2026-11-06
estimate:
  tokens: 70000
actuals:
  tokens: 4500
  tasks: 2
  commits: 2
plan_head_before: 9f6d54d9a0029156627954dd71a0030cd01d527e
plan_head_after: a8341a53b4c609e808b038715bcbb6fbc5751460
---

# Phase 3 Plan 03: Saved cars hearts and header count Summary

A heart on every listing card saves the car id to one localStorage key through a `useSyncExternalStore` store; the header Saved link shows the count in a fixed-width slot, follows other tabs, and falls back to memory when storage is blocked.

## What was built

- `src/lib/saved/store.ts`: snapshot is the raw string (no render loop), server snapshot `"[]"` (no hydration mismatch), `parseIds` keeps `/^\d{1,12}$/` strings, deduped, capped at 100, newest first. `setSavedIds` notifies this tab directly; `storage` events on the key (or a clear, key `null`) notify other tabs. Nothing touches `window` or `localStorage` at import.
- `HeartIcon`: outline in `currentColor`, plus a `fill-accent` layer that fades over 150ms (instant under reduced motion), outline drawn on top.
- `SaveButton`: native button, `aria-pressed`, constant `aria-label`, polite live region announcing `Saved` / `Removed from saved`. `card` is a 44px scrim-60 circle with a 20px blur (solid ink under reduced transparency), top right, 8px inset, `z-20`; `page` is a 44px square secondary button for 03-07.
- `ListingCard`: heart as a sibling in the photo div, outside the stretched title link; sold cards keep it.
- `SavedLink` in `SiteHeader` after `Used cars`, 8px gap: 44px-high link to `/saved`, 20px count slot always rendered, number fades in, `99+` above 99, name `Saved cars` / `Saved cars, {n}`.

## Verification

- `npm run typecheck` 0, `npm run lint` 0, `npm test` 263 passed (14 new in `store.test.ts`).
- `npm run build` 0, then the full Playwright suite on the production build (`PORT=3103`): 117 passed after Task 1; `e2e/saved.spec.ts` 6 passed after Task 2.
- Tracer gate (auto mode): verify re-run end to end after Task 1, passed, expanded.

## TDD note

Task 2 tests went green on the first run: Task 1 already built the store to the research skeleton plus the behaviours listed (the tracer needed a working store). The tests would fail against the research skeleton's fallback (it reads storage first, so a quota error would leave toggles stuck), which is the case they guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Carousel tab-order spec assumed the title came right after the arrows**
- **Found during:** Task 1
- **Issue:** `e2e/carousel.spec.ts` "See all photos tile" pressed Shift+Tab three times from the card title; the heart is now a focus stop between the arrows and the title.
- **Fix:** The spec now asserts the heart is the first stop back from the title, then three more to the tile link.
- **Files modified:** e2e/carousel.spec.ts
- **Commit:** 652e342

## Known limits

- `99+` at 14px semibold is about 22px wide, 2px wider than the 20px slot. It overflows to the right without moving anything (fixed width, `whitespace-nowrap`), so no layout shift; only visible above 99 saved cars, and the cap is 100.
- The Saved link points at `/saved`, which 03-07 adds on this branch before the PR. Until then it 404s.
- No decision checkpoints in this plan, so nothing was posted to #47.

## Self-Check: PASSED

- Files exist: store.ts, store.test.ts, SaveButton.tsx, SavedLink.tsx, e2e/saved.spec.ts.
- Commits on HEAD: 652e342, a8341a5.
