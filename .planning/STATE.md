---
gsd_state_version: "1.0"
current_phase: 05
current_phase_name: Quality Pass
status: in_progress
last_updated: "2026-11-08"
last_activity: 2026-11-08
last_activity_desc: Phases 1 to 4 built and merged; Quality Pass open on Lighthouse (#92)
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 33
  completed_plans: 33
  percent: 90
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-08)

**Core value:** A buyer can find a car on their phone, fast, and send the dealer an enquiry about it.
**Current focus:** Phase 05 — Quality Pass

## Current Position

Phase: 05 (Quality Pass), in progress. Phases 1 to 4 are built and merged.
Open: Lighthouse 95+ on the stock and car pages (#92), real-device checks (#44, #77), and the dealer inputs under Blockers.
Last activity: 2026-11-08, PR #96 and the social, Checkwork and compare-photo PR.

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 6min | 2 tasks | 4 files |
| Phase 01 P02 | 8min | 2 tasks | 1 files |
| Phase 01 P03 | 60min | 3 tasks | 9 files |
| Phase 01 P04 | 15min | 2 tasks | 9 files |
| Phase 01 P05 | 40min | 3 tasks | 8 files |
| Phase 01 P07 | 25min | 2 tasks | 4 files |
| Phase 01 P09 | 25 min | 2 tasks | 10 files |
| Phase 01 P06 | 25 min | 2 tasks | 6 files |
| Phase 01 P08 | 40min | 2 tasks | 4 files |
| Phase 03 P01 | 35m | 3 tasks | 3 files |
| Phase 03 P04 | 50m | 2 tasks | 17 files |
| Phase 03 P05 | 10m | 2 tasks | 5 files |
| Phase 03 P06 | 25m | 3 tasks | 16 files |
| Phase 03 P08 | 25m | 2 tasks | 15 files |
| Phase 03 P09 | 20m | 1 tasks | 7 files |
| Phase 03 P10 | 70m | 2 tasks | 22 files |
| Phase 03 P11 | 45m | 2 tasks | 16 files |
| Phase 03 P12 | 20m | 2 tasks | 9 files |
| Phase 03 P13 | 25m | 3 tasks | 15 files |
| Phase 03 P14 | 40m | 3 tasks | 17 files |
| Phase 03 P15 | 50m | 2 tasks | 14 files |
| Phase 03 P16 | 45m | 2 tasks | 13 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Coarse granularity, 5 phases. Foundation (#1, FND-01) is validated and sits outside the phases.
- [Roadmap]: #2 (design contract) leads Phase 1 because it gates all UI. #16 (CarsIreland investigation) sits in Phase 1 so the feed shape informs the `StockProvider` interface.
- [Roadmap]: Saved cars (#10) sit in Phase 3 with the lead and finance forms: all are buyer actions on a car.
- [Roadmap]: Each GitHub issue is one PR (`Closes #n`); phase detail in ROADMAP.md lists the issues per phase.
- [Phase 01]: Stock provider facets use one matches(car, q, skip) predicate so counts stay disjunctive
- [Phase 01]: km-asc sorts cars without mileage last via MAX_SAFE_INTEGER, not Infinity
- [Phase 01]: Carsie provider stays unbuilt; docs/carsie-feed.md records unknowns as unknown (D-09)
- [Phase 01]: Demo photos 900x675 WebP q72, 57 cars, 20.4 MB accepted by owner (01-03)
- [Phase 01]: Logo PNG deferred in 01-04: no local copy and dealer-host requests were barred in that run; fetch it with the command in 01-04-SUMMARY.md
- [Phase 01]: 01-05: car route is [slug] directly under /used-cars; later dynamic routes there must reuse [slug]
- [Phase 01]: 01-07: use ref-callback load/error listeners, not next/image onError (it re-sets src and re-requests photos); carousel is z-10 above the card's stretched title link
- [Phase 01]: 01-09: provider failure is caught in the stock page (no error.tsx) so Sort and filters stay mounted; the E2E failure switch is env-only and CI proves it is off on the Worker
- [Phase 01]: 01-09: loading.tsx adds about 300 ms of skeleton on every first load with the in-memory provider (React reveal throttle); owner may delete it
- [Phase 01]: 01-06: chips row hides its Clear all filters when the result is empty (the empty state carries it); facet options use aria-disabled so they stay focusable
- [Phase 01]: 01-08: the sheet's primary button reads summary.total, which only changes when a result lands, so it keeps the last count while pending
- [Phase 03]: Photo transport is action-formdata (photos in the lead server action FormData; 15 MB picked, 4 MB stored, 16 MB per request, 12 files, 18mb body cap). Overnight default, logged on #47
- [Phase 03]: Packages approved against vintage's lockfile (same version and sha512) because 03-02 is not done
- [Phase 03]: A sold or unknown car refuses the lead with failed/server and logs outcome invalid, not error
- [Phase 03]: A markNotified failure after a sent email counts as notify_failed
- [Phase 03]: LEAD_FROM_EMAIL is a placeholder (leads@cgaudino.com) until 03-02 records the sending address; logged on #47
- [Phase 03]: Leads columns locked as research-columns (D-03). Overnight default, logged on #47; migration generated, not applied to any database
- [Phase 03]: deploy.yml carries Cloudflare's always-pass Turnstile test site key as a PLACEHOLDER until 03-02; leads fail closed on the demo until real keys exist (#47)
- [Phase 03]: Turnstile is reset only after answers that may spend the token, not after a field error or rate limit
- [Phase 03]: /privacy deletion contact is DEALER_PHONE only (no public email yet); DEALER_PHONE stays unconfirmed (#47)
- [Phase 03]: Client lead components import constants from src/lib/leads/constants.ts, never schema.ts (keeps zod out of the bundle)
- [Phase 03]: PR #49 (#11) opened without DATABASE_URL; do not merge until 03-02 provisioning is done
- [Phase 03]: BUDGETS lives in src/lib/stock/types.ts so the server schema can read it (a value from a use client file is a client reference on the server); logged on #47
- [Phase 03]: Server form pages render LeadPageForm, which picks the field set by type (a server page cannot pass LeadForm's render function); logged on #47
- [Phase 03]: 03-13: trade-in photos go to a private EU R2 bucket under trade-in/{leadId}/, checked by bytes and caps with the fields; dealer links are HMAC-signed for 7 days; no bucket or secret provisioned yet (A6 untested)
- [Phase 03]: 03-14: photos are shrunk to 2,000px JPEG on the phone and kept in LeadForm state; send waits while they shrink; #12 PR opened while #49 is open
- [Phase 03]: 03-15: finance calculator on /finance with PLACEHOLDER config and production guard test; finance application is a lead with deposit, term and employment only (D-17); deposit required
- [Phase 03]: 03-16: Finance section on in-stock car pages priced 1,000 to 250,000; #9 PR #51 opened while #49 and #50 are open; placeholder figures need the dealer's terms, wording and credit intermediary status

### Pending Todos

None yet.

### Blockers/Concerns

- Client inputs still open: finance terms and wording (#55), Google place ID and key (#56, #64), dealer email and domain (#54, #63), social links (#97), stock feed (#65), real stock and resized photos (#92). Demo data and clearly labelled placeholders cover each until the client supplies them.
- After the domain is bought: add the site to the uptime alert (#98) and set the Cloudflare rate-limit rule (#66).
- Deploy on merge is the decision (owner, 2026-11-06). Reverting to release-tag deploys is tracked in #37.
- Cloudflare Access must stay on `carright.cgaudino.com` while the demo data (the dealer's photos) is in. The demo is not public.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-08
Stopped at: PR for social icons, Checkwork credit, compare photos and the iOS card fix
Resume file: None
