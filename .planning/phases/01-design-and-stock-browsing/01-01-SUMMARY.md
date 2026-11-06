---
phase: 01-design-and-stock-browsing
plan: 01
subsystem: stock-provider
tags: [stock-provider, contract-test, faceting, eslint]

requires: []
provides:
  - "StockProvider interface and Car/StockQuery/StockResult/Facets types (D-05)"
  - "createFileProvider: in-memory filter, five sorts, paging, disjunctive facets, getBySlug, getById"
  - "runContract suite reusable by any provider, run for the file provider and an async stub (D-07)"
  - "ESLint guard blocking concrete provider and demo data imports from src/app and src/components (D-06)"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09]

actuals:
  tokens: 4000
  tasks: 2
  commits: 3
plan_head_before: f22071d11ab9cca6bb919477ca3e659a1d645e9d
plan_head_after: 8b5f0abbb866e2931f8e9fdd21ed81ff10bde334

tech-stack:
  added: []
  patterns:
    - "One matches(car, q, skip) predicate drives both the result list and each facet's count, so facets stay disjunctive"
    - "Provider contract suite parameterised by a factory: a new provider joins with one runContract line"

key-files:
  created:
    - src/lib/stock/types.ts
    - src/lib/stock/file-provider.ts
    - src/lib/stock/contract.test.ts
  modified:
    - eslint.config.mjs

key-decisions:
  - "Search text is held in a side Map keyed by car id so returned Car objects carry no internal fields (T-01-03)"
  - "Sorts rely on a presorted newest-first base plus stable Array.sort, giving the id-descending tie-break for every key"
  - "km-asc puts cars without mileage last using Number.MAX_SAFE_INTEGER (Infinity - Infinity would be NaN)"

requirements-completed: [STK-01, STK-03]

duration: 6min
completed: 2026-11-05
status: complete
---

# Phase 1 Plan 01: Stock provider contract Summary

**StockProvider interface with an in-memory file provider (filters, five sorts, paging, disjunctive facet counts), a 15-row contract suite run against two providers, and an ESLint guard that keeps pages provider-agnostic.**

## Performance

- **Duration:** about 6 min
- **Tasks:** 2 (1 tracer, 1 TDD)
- **Files:** 3 created, 1 modified

## Accomplishments

- `src/lib/stock/types.ts` written exactly as the plan's interface block.
- `createFileProvider(cars)` answers any `StockQuery` with cars, total, page, pageCount and facets. Facet counts ignore their own group's selection, keep every stock value at 0, and always include a selected value. The model facet lists models of the selected makes with `parent`.
- `contract.test.ts` exports `runContract(name, makeProvider)` and runs it for `file` and `stub` (own `structuredClone` of the data, async I/O). 30 tests pass.
- `eslint.config.mjs` restricts `**/lib/stock/*-provider` and `**/lib/stock/demo-cars*` in `src/app/**` and `src/components/**`. A probe file importing the file provider from `src/app` exits 1 and the real tree lints clean.
- No caching added (Cache Components are off, per the plan's cache note).

## Task Commits

1. Task 1 (tracer): `fe63e6f` feat(01-01): StockProvider contract, file provider tracer and lint guard
2. Task 2 RED: `b49c478` test(01-01): pin the stock provider contract (16 of 30 tests failing)
3. Task 2 GREEN: `8b5f0ab` feat(01-01): filters, sorts and disjunctive facets in the file provider

## Verification

- `npx vitest run src/lib/stock/contract.test.ts`: 30 passed
- `npm test`: 31 passed (robots test still passes)
- `npm run lint`: exit 0; lint probe: exit 1
- `npx tsc --noEmit`: exit 0
- `grep -c "console\." src/lib/stock/file-provider.ts`: 0

## Deviations from Plan

- **Branch:** the plan names `feat/stock-provider`; the orchestrator directed work on `feat/phase-1-stock-browsing`, so all commits are there. Not a code deviation.
- The tracer's `make` facet counted every car; Task 2 replaced it with the shared disjunctive facet helper as the plan intended.

No Rule 1-4 deviations.

## Known Stubs

None.

## Threat Flags

None. T-01-02 (import guard) and T-01-03 (no leaked fields) are mitigated and tested.

## Self-Check: PASSED

- FOUND: src/lib/stock/types.ts, file-provider.ts, contract.test.ts, eslint.config.mjs
- FOUND commits: fe63e6f, b49c478, 8b5f0ab
