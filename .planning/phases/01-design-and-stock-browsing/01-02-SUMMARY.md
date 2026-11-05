---
phase: 01-design-and-stock-browsing
plan: 02
subsystem: docs
tags: [carsie, carsireland, investigation, docs]

requires: []
provides:
  - "docs/carsie-feed.md: sourced and dated findings on the CarsIreland/Carsie feed, auth, rate limits and terms (STK-04)"
  - "Field mapping from every Car field to cartwright.ie today and to what a feed must supply"
  - "Six steps to add a Carsie provider with no page change (STK-03, docs half)"
  - "Ten numbered questions for the client"
affects: [01-03]

actuals:
  tokens: 3000
  tasks: 2
  commits: 2
plan_head_before: 224d78d2b18384df6c8052ed8819a57b57573220
plan_head_after: 7c9d912375c0be9b40da6aff2cafd688d8c3d8ea

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - docs/carsie-feed.md
  modified: []

key-decisions:
  - "No provider is built and nothing about the Carsie API is assumed: every unknown is written as unknown (D-09)"

requirements-completed: [STK-03, STK-04]

duration: 8min
completed: 2026-11-05
status: complete
---

# Phase 1 Plan 02: Carsie feed investigation Summary

**docs/carsie-feed.md records what is and is not known about a CarsIreland dealer feed, maps each Car field to its source, gives the six steps to plug in a second provider without touching a page, and ends with ten questions for the client.**

## Accomplishments

- `docs/carsie-feed.md` has seven sections: summary, What we know (10 sourced, dated rows), Feed and auth, Rate limits, Terms and images, Field mapping, Adding a Carsie provider, Questions for the client.
- Fresh finding on 2026-11-05: the CarsIreland site is an Angular app whose page data shows it reads from its own internal REST service (`privateapi.carsireland.ie`, paths like `/rest/1.0/ci/dealer`). Recorded as the site's internal service, not called, not a documented feed. The dealer page reports 58 cars (research saw about 57).
- Field mapping lists all 14 `Car` fields in order from `types.ts`, plus two rows for data the dealer page does not show: listing date (A2 stand-in) and sold or removed state (CAR-02).
- The doc states the terms are unknown and that the demo data is for the private pitch only (D-04). It contains no key, nonce, cookie or contact detail.

## Task Commits

1. Task 1 (tracer): `9b497c2` docs(01-02): CarsIreland findings, feed, limits and terms
2. Task 2: `7c9d912` docs(01-02): field mapping, adding a Carsie provider, client questions

## Verification

- `grep -c "^## "`: 4 after Task 1, 7 after Task 2
- Em dash grep and nonce-shaped grep: no matches
- All 12 field-name greps present; Adding section names `src/lib/stock/index.ts`, `src/lib/stock/contract.test.ts`, `runContract`; 10 numbered questions
- Docs-only: no lint, typecheck, tests or E2E run (CLAUDE.md step 4)

## Outside requests sent (for the owner to confirm)

D-10 and D-13 name only www.cartwright.ie, so these carsireland.ie requests are listed here and must go in the #16 PR description. All GET, read only, once each, user agent `cartwright-demo-build/1.0`, 2026-11-05:

- `GET https://www.carsireland.ie/robots.txt` (200)
- `GET https://www.carsireland.ie/` (200)
- `GET https://www.carsireland.ie/car-dealers/county/kerry/cartwright` (200)

No curl fallback was needed beyond these (curl was used for all three; WebFetch was not used). Nothing was sent to www.cartwright.ie, to `privateapi.carsireland.ie`, or to `/terms`. One extra curl to `robots.txt` was made first as a reachability probe (200), so that URL was requested twice.

## Deviations from Plan

- **Web searches not run.** The plan allows up to three. No web search tool exists in this executor session, so none ran. The doc says so and keeps the earlier research search as a secondary, unverified source. The CarsIreland `/terms` page was not fetched because the plan lists only three URLs; the doc records it as unread and the client questions cover terms.
- **Branch.** The plan names `docs/carsie-feed`; the orchestrator directed work on `feat/phase-1-stock-browsing`, so commits are there. The PR and project-board steps in the plan (open PR for #16, move #16 to In Review) were not done in this run and remain for the owner or orchestrator.

No Rule 1-4 deviations.

## Known Stubs

None.

## Threat Flags

None. T-01-04 (no secrets in the doc) and T-01-05 (no claim of permission) are mitigated and checked.

## Self-Check: PASSED

- FOUND: docs/carsie-feed.md
- FOUND commits: 9b497c2, 7c9d912
