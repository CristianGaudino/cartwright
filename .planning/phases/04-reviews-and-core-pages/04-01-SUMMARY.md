---
phase: 04-reviews-and-core-pages
plan: 01
subsystem: reviews
status: complete
tags: [reviews, provider, places-api, attribution, tracer]
requires: []
provides:
  - "Review, Reviews, ReviewsProvider types, DEMO_REVIEWS and getReviews() in src/lib/reviews/index.ts"
  - "createPlacesProvider() for Places API (New) in src/lib/reviews/places-provider.ts"
  - "ReviewsStrip, StarRating, GoogleAttribution in src/components/reviews/ReviewsStrip.tsx"
  - "PlaceholderPill and StarIcon"
affects: ["04-03 dealerJsonLd (Reviews type)", "04-04 home page"]
tech-stack:
  added: []
  patterns: ["provider picked by env per call, one module-level provider so its day memo survives", "clipped star overlay, pure CSS"]
key-files:
  created: [src/lib/reviews/index.ts, src/lib/reviews/index.test.ts, src/lib/reviews/places-provider.ts, src/lib/reviews/places-provider.test.ts, src/components/reviews/ReviewsStrip.tsx, src/components/reviews/ReviewsStrip.test.ts, src/components/PlaceholderPill.tsx, e2e/reviews.spec.ts]
  modified: [src/components/stock/icons.tsx, src/app/page.tsx]
decisions:
  - "Demo reviews pill in every environment (UI-SPEC deviation from D-01), logged on #47"
  - "Google's Places policy over the UI-SPEC wording: Google Maps attribution, ordering notice, policy link, per-review link, original text"
  - "Tasks committed as one commit per plan (run instruction: few finished commits)"
metrics:
  duration: 10m
  completed: 2026-11-08
estimate:
  tokens: 70000
actuals:
  tokens: 9500
  tasks: 3
  commits: 1
plan_head_before: 49ae06ae8d687bce9dec43d922057830ff6a3156
plan_head_after: d919752
---

# Phase 4 Plan 01: Reviews provider, demo reviews and Places provider Summary

The home page shows a What customers say section with five clearly fictional reviews under a Demo reviews pill. Each card carries stars, a hidden rating sentence, the author, the relative time linked to Google Maps and the `Google Maps` attribution. Setting `GOOGLE_PLACE_ID` and `GOOGLE_PLACES_API_KEY` swaps in Places API (New) data with no page change.

## What was built

- **Contract and fixtures:** `Review` / `Reviews` / `ReviewsProvider`. `DEMO_REVIEWS` has five `Sample customer A.` to `E.` reviews rated 5, 5, 5, 4, 5, with rating 4.8 and count 5. `getReviews()` reads env per call and returns the demo unless both vars are set. A configured provider's null is never replaced by fixtures. The module imports `server-only`.
- **Places provider:** a GET to `places.googleapis.com/v1/places/{id}` with the key only in `X-Goog-Api-Key`, the field mask, `AbortSignal.timeout(3000)` and `next.revalidate: 86400`. Every field is checked by hand and only https URLs are kept. It uses `originalText`. Any failure is null and nothing is logged. A success is reused for 24 hours per isolate (`shortcut:` comment about the dummy incremental cache). The 04-04 audit added sharing of an in-flight call.
- **ReviewsStrip:** returns nothing for no data. It has the pill, h2, ordering notice, aggregate row (Display number, 20px stars clipped to `rating/5`, `Based on {count} Google reviews`, `See all on Google Maps`), a focusable `Google reviews` region, the review policy link and the `prefers-contrast: more` border. Below 1024px it is a native scroll-snap strip that bleeds to the screen edge (256px cards, 320px from 640px). From 1024px it is a 3 column grid, with reviews after the third `lg:hidden`. A profile photo shows only when Google supplies one (lazy, `no-referrer`).

## Verification

- `npx vitest run src/lib/reviews src/components/reviews`: 3 files, 35 tests pass
- typecheck 0, lint 0, build 0, `e2e/reviews.spec.ts` + `smoke.spec.ts`: 6 passed (PORT=3207)

## Deviations from Plan

**1. [Rule 1 - Bug] The page scrolled sideways at 320px.** The cards' `sr-only` text is absolutely positioned and escaped the strip's overflow clip (page scrollWidth 1201). Adding `relative` to the scroll region fixed it. Commit d919752.

**2. [Run instruction] One commit for the plan's three tasks.**

**3. Policy over UI-SPEC copy:** the plan's policy note, applied as written (`See all on Google Maps`, `Google Maps` attribution).

## Known Stubs

| File | Reason |
|------|--------|
| src/lib/reviews/index.ts DEMO_REVIEWS | Fictional reviews, labelled in every environment, until the owner sets the Google place ID and key |

## Threat Flags

None beyond the register: the key stays server-side (`server-only`, header only, no console calls, unit tested), and only https URLs reach `href` or `src`.

## Commits

| Tasks | Commit |
|-------|--------|
| 1 to 3 | d919752 |

## Self-Check: PASSED

- FOUND: src/lib/reviews/index.ts, places-provider.ts, ReviewsStrip.tsx, PlaceholderPill.tsx, e2e/reviews.spec.ts
- FOUND: commit d919752 in HEAD
