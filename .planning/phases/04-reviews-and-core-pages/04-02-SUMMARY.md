---
phase: 04-reviews-and-core-pages
plan: 02
subsystem: pages
status: complete
tags: [pages, service, about, terms, privacy, placeholders, tracer]
requires:
  - "04-01: PlaceholderPill"
provides:
  - "InfoPage, InfoSection and CallButton in src/components/InfoPage.tsx"
  - "/service, /about, /terms; /privacy on the shared frame"
  - "DEALER_FACTS_CONFIRMED and SERVICES in src/lib/site.ts, with a production guard in src/lib/site.test.ts"
affects: ["04-03 /contact (CallButton, InfoSection)", "go-live: dealer facts must replace placeholders"]
tech-stack:
  added: []
  patterns: ["placeholder flag in site.ts guarded by a production-only unit test, as finance.config"]
key-files:
  created: [src/components/InfoPage.tsx, src/app/service/page.tsx, src/app/about/page.tsx, src/app/terms/page.tsx, src/lib/site.test.ts, e2e/pages.spec.ts]
  modified: [src/lib/site.ts, src/app/privacy/page.tsx, src/app/sitemap.ts, .github/workflows/ci.yml]
decisions:
  - "No service booking form: Call to book only (D-05)"
  - "CallButton and InfoSection live beside InfoPage so /contact reuses them"
metrics:
  duration: 5m
  completed: 2026-11-08
estimate:
  tokens: 45000
actuals:
  tokens: 5000
  tasks: 3
  commits: 1
plan_head_before: d919752
plan_head_after: 9cf57fe
---

# Phase 4 Plan 02: Service, about and terms on a shared frame Summary

/service, /about and /terms exist with the UI-SPEC copy, each under a `Placeholder details` pill above the h1. /privacy keeps its Phase 3 copy word for word on the same frame, with no pill. A production deploy fails its test step while `DEALER_FACTS_CONFIRMED` is false.

## What was built

- **site.ts:** `DEALER_FACTS_CONFIRMED = false` and `SERVICES = ["Servicing", "Repairs", "Tyres"]`, both marked `PLACEHOLDER`.
- **InfoPage:** the privacy page frame, with the pill first when `placeholder` is set and facts are unconfirmed, then the h1, the optional intro and a 65ch column. `InfoSection` (h2 plus 8px). `CallButton` is the accent `tel:` button: 48px, full width on phones, at least 240px from 640px.
- **Pages:** /service has the services as a check list, `Call to book` and the number under it. /about has Who we are and Visit us, linking `/contact`. /terms has the draft card and five sections with the UI-SPEC copy, plus the dealer's phone as a tel link.
- **Sitemap:** adds `/`, `/service`, `/contact`, `/about` and `/terms`. `/contact` and its CI entry were added here, a plan early, so ci.yml changed once. **CI worker:** `/service`, `/contact`, `/about` and `/terms` must answer 200.

## Verification

- `npx vitest run src/lib/site.test.ts src/robots.test.ts`: 5 pass
- typecheck 0, lint 0, build 0; `pages.spec.ts` + `leads.spec.ts` + `smoke.spec.ts`: 22 passed

## Deviations from Plan

**1. [Order] `/contact` was added to the sitemap and the CI case list in this plan's commit,** not in 04-03. It is the same PR either way.

**2. [Run instruction] One commit for the plan.**

## Known Stubs

| File | Reason |
|------|--------|
| src/lib/site.ts SERVICES, DEALER_FACTS_CONFIRMED | Dealer to confirm. The pill shows, and site.test.ts blocks production |
| src/app/about/page.tsx Who we are | Generic copy until the dealer's story arrives |
| src/app/terms/page.tsx | Draft terms, labelled as a draft |

## Commits

| Tasks | Commit |
|-------|--------|
| 1 to 3 | 9cf57fe |

## Self-Check: PASSED

- FOUND: InfoPage.tsx, service/about/terms pages, site.test.ts, e2e/pages.spec.ts; `/service 200`, `/about 200`, `/terms 200` in ci.yml
- FOUND: commit 9cf57fe in HEAD
