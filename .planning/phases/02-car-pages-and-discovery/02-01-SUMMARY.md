---
phase: 02-car-pages-and-discovery
plan: 01
subsystem: stock-provider
tags: [stock-provider, sold, demo-data, contract]
requires: []
provides:
  - "Car.soldAt, SOLD_VISIBLE_DAYS (30), isSold, Lookup, Taxonomy, StockQuery.sold"
  - "StockProvider.lookup and taxonomy; createFileProvider(cars, { now })"
  - "Demo data with sale dates and the dealer's extra specs, description and equipment"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08]
tech-stack:
  added: []
  patterns: ["clock injected into the provider and read per call", "sold pool and stable partition for sold: include"]
key-files:
  created: []
  modified:
    - src/lib/stock/types.ts
    - src/lib/stock/file-provider.ts
    - src/lib/stock/contract.test.ts
    - src/lib/stock/demo-cars.test.ts
    - src/lib/stock/demo-cars.json
    - scripts/stock/demo-stock.mjs
    - docs/carsie-feed.md
    - README.md
key-decisions:
  - "Sale date is never rendered; the type comment says so (owner instruction 2026-11-06)"
  - "Extra specs, description and equipment parsed offline from .stock-cache; no request sent to any site"
  - "Road tax, engine power, fuel economy and NCAP are not stored; max speed stays in mph"
requirements-completed: [CAR-01, CAR-02, CAR-07]
status: complete
duration: ~35 min
completed: 2026-11-06
actuals:
  tokens: 60000
  tasks: 3
  commits: 3
plan_head_before: 685561118cc83f3367f0cc3982441c07c94fdbde
plan_head_after: 7e3feeb44dcddff6b7005cbb27b472bfe999bfbe
---

# Phase 2 Plan 01: Sold-car stock contract and fuller demo data Summary

The stock provider now has a sale date with a 30-day window, a live/gone/unknown `lookup` for 410 vs 404, sold cars kept out of default lists and facets (opt-in `include`/`only`), a `taxonomy()` over every car ever listed, and the demo data carries the dealer's full spec, description and equipment.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: one sold car end to end (sale date, hidden from lists, gone after the window) | 750fa24 |
| 2 | Full sold contract: include/only, sort order, taxonomy, suite both providers must pass | 8a23778 |
| 3 | Spec fields, description and equipment parsed offline | 7e3feeb |

Tracer gate: `<verify>` (vitest on `src/lib/stock`, `tsc --noEmit`, `public/stock` unchanged) re-run end to end after Task 1 and passed before expanding.

## Demo sold cars (set relative to the build day, 2026-11-06)

| Id | Make | Days ago | Sale date | Why |
| -- | ---- | -------- | --------- | --- |
| 4521033 | Tesla (only car) | 4 | 2026-11-02 | one-car make sold inside the period |
| 4532458 | Volvo (only car) | 120 | 2026-07-09 | one-car make, expired |
| 4491477 | Ford (lowest id) | 1 | 2026-11-05 | sold, make still has stock |
| 4359735 | Volkswagen (lowest id) | 9 | 2026-10-28 | sold, make still has stock |
| 4396311 | Hyundai (lowest id) | 45 | 2026-09-22 | expired, make has stock |

All named makes existed, no substitutions.

## Per-field counts (57 cars)

engineLitres 54, colour 57, doors 57, seats 57, owners 57, nctExpiry 56, maxSpeedMph 51, zeroTo62Secs 50, description 57, features 49, soldAt 5.

## Verification

- `npm test` 212 passed (exit 0); `npx tsc --noEmit` exit 0 (after `next typegen`, which `npm run typecheck` runs); `npm run lint` exit 0.
- `git status --porcelain public/stock` printed nothing after both builds: photo files byte-identical.
- `.stock-cache/requests.log` 404 lines before and after: no network request.
- The fetch command and its helpers (`get`, `fetchCmd`, `fetchList`, `fetchDetails`, `fetchPhotos`) are untouched.
- Contract suite pins the clock (`NOW`) and runs every sold rule against both the file and the stub provider. The pre-existing `runContract` expectations pass unchanged with four sold fixture cars present.

## Deviations from Plan

None to the code scope. Notes:

1. **Worktree base:** HEAD was 4f1f0e2, not 6855611; the worktree was clean with no commits, so `git reset --hard 6855611` was run as instructed.
2. **Cache copied into the worktree:** `.stock-cache` (gitignored, main checkout only) was copied to the worktree so the offline build could read it. It is not committed.
3. **`next typegen` needed before `tsc`:** a fresh worktree lacks the generated `PageProps` types, so bare `tsc --noEmit` fails on three `src/app/used-cars` files until `npx next typegen` runs. Pre-existing, not caused by this plan.
4. **Branch:** the plan says create `feat/car-pages`; as dispatched, commits are on the worktree branch `worktree-agent-a13f3f145b6b4a677`. The orchestrator owns the branch the PR uses.

## Issues / data notes for later plans

- **Marker-less blurbs (8 of 58, 7 built):** the plan says the whole text is the description and there is no equipment list. For about six of them (e.g. 4396311, 4520171, 4381995, 4474493, 4401031, 4390543) the blurb is a short word followed by the equipment as a comma-separated line, so `description` is "exe\nElectrically adjustable seats, Electric handbrake, ...". Followed the plan as written. Plan 02-04 may want to hide or trim a description line that is just a comma list, or the parser can split those later.
- The first demo car's description (and similar ones) contains lines ending with commas, as the dealer typed them. Left as published.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file-access surface. T-02-01 to T-02-04 mitigations are in place: tag/entity stripping with a test over every string and array value, contact lines removed and tested, sale date commented as never rendered, no network in `build`.

## Self-Check: PASSED

- Commits 750fa24, 8a23778, 7e3feeb exist on the branch.
- Files modified exist: types.ts, file-provider.ts, contract.test.ts, demo-cars.test.ts, demo-cars.json, demo-stock.mjs, carsie-feed.md, README.md.
