---
phase: 03-leads-finance-and-saved-cars
plan: 07
subsystem: saved-cars
status: complete
tags: [saved-cars, route-handler, saved-page, pr, tracer]
requires: ["03-03"]
provides:
  - "GET /api/saved-cars?ids= -> { cars, goneIds }, no sale date, no description or features"
  - "SavedCars: the /saved body (snapshot of ids, fetch, prune, skeleton, empty, gone note, error)"
  - "/saved page, noindex, not in the sitemap"
  - "Save this car button beside Share in BuyBox"
  - "removeSaved(gone) in the saved store; src/lib/saved/ids.ts (MAX_SAVED, ID) shared with the route"
  - "SkeletonCards and StockError as their own modules"
affects: []
tech-stack:
  added: []
  patterns: ["route handler with plain Request/Response.json", "client fetch with a stale flag and a retry counter", "hydrated flag via useSyncExternalStore before taking a one-time snapshot of the ids"]
key-files:
  created: [src/app/api/saved-cars/route.ts, src/app/api/saved-cars/route.test.ts, src/app/saved/page.tsx, src/components/saved/SavedCars.tsx, src/components/stock/SkeletonCards.tsx, src/components/stock/StockError.tsx, src/lib/saved/ids.ts]
  modified: [src/lib/saved/store.ts, src/lib/saved/store.test.ts, src/components/car/BuyBox.tsx, src/components/stock/StockShell.tsx, "src/app/used-cars/(browse)/loading.tsx", "src/app/used-cars/(browse)/page.tsx", e2e/saved.spec.ts, e2e/car-page.spec.ts]
decisions:
  - "MAX_SAVED and the id regex moved to src/lib/saved/ids.ts: a route handler cannot import store.ts (it imports client React hooks)"
  - "Pruning goes through a new removeSaved(gone) that reads the current list, so a heart tapped while /saved loads is kept"
  - "An empty or missing ids query is a 400 like any other bad input; the page never asks with no ids"
  - "StockError and the state button moved out of StockShell so /saved does not load the filter UI (ponytail audit finding)"
metrics:
  duration: 25m
  completed: 2026-11-06
estimate:
  tokens: 75000
actuals:
  tokens: 6600
  tasks: 2
  commits: 3
plan_head_before: f1fc75af34a0eba1094c0ace80555ba601ec6ef5
plan_head_after: 792b4dbd145da8f8d8f5b6031348664a77ba80ac
---

# Phase 3 Plan 07: /saved page, saved-cars API and the car-page heart Summary

/saved lists the buyer's saved cars through `GET /api/saved-cars` (a by-id lookup that never sends a sale date). It handles sold, gone, empty and failed states. The car page gets Save this car beside Share. The #10 PR is open: https://github.com/CristianGaudino/cartwright/pull/48

## What was built

- `src/app/api/saved-cars/route.ts`: ids must be 1 to 100 digit strings (`^\d{1,12}$`), otherwise 400. Duplicates are dropped and `stock.getById` runs in parallel. It returns `{ cars, goneIds }` in the order asked. `description` and `features` are dropped, and `soldAt` becomes `sold`. Headers: `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. The test covers live, unknown, sold in the window (no `YYYY-MM-DD` in the body), sold past the window (gone) and the 400 cases.
- `SavedCars`: a `useSyncExternalStore` flag tells it when storage has been read. It then snapshots the ids once, so unsaving keeps the card until the next visit. Before the read it shows 3 static skeletons, then min(ids, 6) while loading, so there is never an empty flash. Gone ids are pruned only on a good answer, with the one-time `role="status"` note. Empty shows `No saved cars yet` and `See used cars`. A failure shows the Phase 2 error, and its retry refetches without pruning.
- `/saved`: h1 `Saved cars`, metadata `robots: { index: false }`, not in the sitemap.
- `BuyBox`: `SaveButton variant="page"` labelled `Save this car`, then Share, 8px apart. On a sold car both sit on the left. The 03-03 `page` variant styling was already complete.

## Verification

- `npm run lint; echo $?` 0, `npx tsc --noEmit` 0, `npm run typecheck` 0, `npm test` 0 (268 passed).
- `APP_ENV=production npm run build` 0, then `APP_ENV=production PORT=3107 npm run e2e`: 129 passed, 0 skipped.
- Tracer gate (auto): after Task 1, `e2e/saved.spec.ts` ran end to end on a production build and passed 7 of 7, so the plan went on to Task 2.
- Pre-PR gate: `origin/main` had nothing new (merge base ff1f10e), so no rebase was needed. `SiteFooter` does not exist yet, and the PR notes that whichever of #10 and #11 merges second adds the footer link.

## Ponytail audit

Healthy. Two findings, both fixed in 792b4db:
1. `/saved` loaded StockShell's filter chunk (about 27 KB raw) through the `StockError` import. That component moved to `src/components/stock/StockError.tsx`, and the build output confirms the `/saved` client chunks no longer contain the filter code.
2. The route does one lookup per id. It now carries a `shortcut:` comment asking for a batch lookup with the CarsIreland provider (#16).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The route could not import the saved store**
- **Found during:** Task 1 build
- **Issue:** `store.ts` imports `useSyncExternalStore`, which a route handler (react-server) cannot import. The build failed.
- **Fix:** `MAX_SAVED` and the id regex moved to `src/lib/saved/ids.ts`, and `store.ts` imports and re-exports `MAX_SAVED`.
- **Commit:** a73caad

**2. [Rule 2 - Correctness] Prune from the current list, not the page's snapshot**
- **Found during:** Task 2
- **Fix:** Added `removeSaved(gone)` to the store, with a unit test.
- **Commit:** a73caad

**3. [Ponytail audit] /saved bundle and route lookup note**: see above. Commit 792b4db.

Also outside the plan's file list: `SkeletonCards` was extracted from `/used-cars` `loading.tsx` so both places share one skeleton, and `StockError` gained an optional `retry` prop.

## Decisions logged

No decision checkpoints came up in this plan, so nothing was posted to #47.

## Known limits

- The header count includes gone ids until the buyer opens /saved, which prunes them (D-20 by design).
- Human check still open: the heart fade and the alignment beside Share on a real phone.
- The `feat/saved-cars` worktree used here is the agent worktree, not `../cartwright-saved`, so there is no extra worktree to remove after merge.

## Self-Check: PASSED

- Files exist: route.ts, route.test.ts, saved/page.tsx, SavedCars.tsx, SkeletonCards.tsx, StockError.tsx, ids.ts.
- Commits on HEAD: a73caad, f7fbc30, 792b4db.
