---
phase: 04-reviews-and-core-pages
plan: 03
subsystem: pages
status: complete
tags: [contact, map, hours, json-ld, local-business, tracer]
requires:
  - "04-01: Reviews type, getReviews, PlaceholderPill"
  - "04-02: DEALER_FACTS_CONFIRMED, CallButton"
provides:
  - "DEALER_ADDRESS and OPENING_HOURS placeholders in src/lib/site.ts"
  - "formatHours, mapQuery, directionsUrl, mapEmbedUrl, dealerJsonLd in src/lib/dealer.ts"
  - "/contact and the MapBox client component"
affects: ["04-04 home page JSON-LD"]
tech-stack:
  added: []
  patterns: ["third-party embed loads only on an explicit tap", "confirmed flag as a default parameter so tests pass both values"]
key-files:
  created: [src/lib/dealer.ts, src/lib/dealer.test.ts, src/app/contact/page.tsx, src/components/MapBox.tsx]
  modified: [src/lib/site.ts, e2e/pages.spec.ts]
decisions:
  - "No contact form: phone and links only (D-05)"
  - "Unconfirmed, the map and directions search Tralee, Co. Kerry, never bracketed text"
metrics:
  duration: 5m
  completed: 2026-11-08
estimate:
  tokens: 55000
actuals:
  tokens: 6000
  tasks: 3
  commits: 1
plan_head_before: 9cf57fe
plan_head_after: a7278d5
---

# Phase 4 Plan 03: Contact page and AutoDealer JSON-LD Summary

/contact has `Call 083 133 3154` as its one accent button, the address in an `address` element, Monday to Sunday hours in a `dl`, links to find-a-car and sell-your-car, and a 4:3 map box. Nothing from Google loads until `Show map` is tapped. `dealerJsonLd()` builds AutoDealer data with no placeholder values and no fictional rating.

## What was built

- **site.ts:** `DEALER_ADDRESS` (`[Street address]`, Tralee, Co. Kerry, `[Eircode]`) and sample `OPENING_HOURS`, both `PLACEHOLDER`.
- **dealer.ts:** `formatHours` (`9am to 6pm`, `12pm to 5:30pm`, `Closed`); `mapQuery`, `directionsUrl` and `mapEmbedUrl` (`encodeURIComponent`, the town only while unconfirmed, and the place ID when set). `dealerJsonLd(reviews, confirmed)`: street, postcode and hours only when confirmed, `aggregateRating` only for `source: "google"` with both numbers, and no geo, priceRange, sameAs, review or areaServed.
- **MapBox** (the phase's only client component): the address and `Show map` until tapped, then a lazy iframe in the same 4:3 box. `Get directions` sits under it and works without JavaScript.
- **/contact:** `await connection()` reads `GOOGLE_PLACE_ID` at request time, JSON-LD through `JsonLd`, the pill above the h1, and two columns from 1024px. No open-now status.

## Verification

- `npx vitest run src/lib/dealer.test.ts`: 9 pass
- typecheck 0, lint 0, build 0; `pages.spec.ts` + `reviews.spec.ts` + `smoke.spec.ts`: 19 passed. These include no Google request on load, the iframe after Show map, JSON-LD shape, and directions without JavaScript.

## Deviations from Plan

**1. [Rule 1] The confirmed-facts bracket check scans values.** `JSON.stringify` of an array always contains `[`, so the check walks the string values instead, with a self-check that it reaches nested values.

**2. [Run instruction] One commit for the plan.** The sitemap and CI entries for `/contact` landed with 04-02.

## Known Stubs

| File | Reason |
|------|--------|
| src/lib/site.ts DEALER_ADDRESS, OPENING_HOURS | Dealer supplies them. The pill shows and JSON-LD leaves them out |

## Threat Flags

None beyond the register: no Google request before the tap (E2E), every URL value encoded, and JSON-LD only through `JsonLd`.

## Commits

| Tasks | Commit |
|-------|--------|
| 1 to 3 | a7278d5 |

## Self-Check: PASSED

- FOUND: dealer.ts, dealer.test.ts, contact/page.tsx, MapBox.tsx (`"use client"`, `aspect-[4/3]`)
- FOUND: commit a7278d5 in HEAD
