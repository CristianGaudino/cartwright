---
phase: 04-reviews-and-core-pages
plan: 04
subsystem: pages
status: complete
tags: [home, header, footer, links, json-ld, pr, tracer]
requires:
  - "04-01: getReviews, ReviewsStrip"
  - "04-02: InfoPage, DEALER_FACTS_CONFIRMED"
  - "04-03: dealerJsonLd"
provides:
  - "Home page / with search, latest arrivals, reviews, help links and AutoDealer JSON-LD"
  - "SiteHeader with Service and Contact from 1024px; SiteFooter with contact block and Shop, Company, Legal groups"
  - "src/links.test.ts: no hash or empty hrefs, no em dash, every nav route has a page"
  - "PR #52 for #13 and #14: https://github.com/CristianGaudino/cartwright/pull/52"
affects: ["#48 saved cars (SiteHeader, SiteFooter conflicts; add /saved to Shop)"]
tech-stack:
  added: []
  patterns: ["nav links as data arrays, scanned by a unit test", "in-flight promise shared by concurrent callers"]
key-files:
  created: [src/links.test.ts, e2e/home.spec.ts, e2e/navigation.spec.ts]
  modified: [src/app/page.tsx, src/components/SiteHeader.tsx, src/components/SiteFooter.tsx, e2e/smoke.spec.ts, e2e/leads.spec.ts, src/lib/reviews/places-provider.ts, src/lib/reviews/places-provider.test.ts, src/app/contact/page.tsx]
decisions:
  - "No Saved cars link: #48 not on this branch"
  - "No mobile menu: the footer is the phone route"
  - "PR opened while #49 to #51 are open, carrying their commits (D-08)"
  - "A failed Places call is still not remembered (plan); left to the owner as a trade-off"
metrics:
  duration: 20m
  completed: 2026-11-08
estimate:
  tokens: 80000
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
plan_head_before: a7278d5
plan_head_after: cd48569
---

# Phase 4 Plan 04: Home page, header and footer, link checks and the PR Summary

The home page shows `Used cars in Tralee` with a plain GET search, the six newest in-stock cars, the reviews section and three help links, and carries the AutoDealer JSON-LD. It never errors when stock fails. Every page shares one header and footer, and the footer reaches every page on a phone. CI fails on a dead link, an em dash or a nav route with no page. PR #52 is open: https://github.com/CristianGaudino/cartwright/pull/52

## What was built

- **Home:** title `Carright | Used cars in Tralee` (absolute). `await connection()`, then stock (`pageSize: 6`, newest, sold excluded; a failure is logged by error name and caught to null) and reviews are loaded together. The hero has no image, a `role="search"` form to `/used-cars` with `name="q"`, `maxLength=80`, and the one accent `Search` button, kept on one row at 320px. Latest arrivals is a 1/2/3 column grid with `priority={false}` and `See all {total} used cars`; the empty and failed states follow the UI-SPEC lines. Then the ReviewsStrip and How we can help, with three whole-card links. Sections are 48px apart, 64px from 1024px.
- **Header:** logo `alt` from `SITE_NAME`; Finance, Sell your car, Find a car, Service and Contact show from 1024px. Below that, only Used cars, as before.
- **Footer:** the logo, `Tralee, Co. Kerry`, the tel link and `Opening hours and directions`; `nav aria-label="Footer"` with Shop, Company and Legal groups as divs with Label-style h2s; `© Carright`, no year. Four columns from 1024px.
- **links.test.ts:** walks `src` (no test files) for hash or empty hrefs in JSX and object form, and for U+2014. It also checks every header and footer path against the page.tsx routes, with route groups stripped. The patterns are built from escapes.

## Pre-PR gate

1. **Ponytail audit** on `6314760..HEAD` plus callers and tests. No must-fix findings. Fixed in 7228a16: concurrent Places calls now share one in-flight call (unit test); the home page logs a stock failure as /used-cars does; the link scan catches `{ href: "#" }`; /contact reuses `InfoSection`. Left for the owner, both stated in the PR: a failed Places call is not remembered (as the plan specifies, so a slow Google can add up to 3s per request), and the home stock-failure branch has no automated test.
2. **Checks after the fixes:** `npm run lint` 0, `npx tsc --noEmit` 0, `npm run typecheck` 0, `npm test` 0 (27 files, 424 tests), `APP_ENV=production NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` 0, `APP_ENV=production PORT=3207 npm run e2e` **185 passed**, exit 0.
3. **Push:** one push of the code and the 04-01 to 04-03 summaries; this summary follows as a docs-only push, which CI ignores (`paths-ignore: **.md`).
4. **PR #52:** against main, not a draft, `Closes #13` and `Closes #14`. The body covers the stacked note (#49 to #51), the audit, the checks, owner provisioning (a) to (f) and the decisions. It ends with the Claude Code line. Not merged.
5. **Board:** PR #52 added to project 6; #13, #14 and #52 set to In Review.
6. **Decisions** logged on #47: https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6700430758

## Deviations from Plan

**1. [Rule 1 - Test] The card link assertion** matched 8 anchors (the photo carousel links too). The test now checks the first link's href.

**2. [Run instruction] E2E on PORT=3207** instead of 3197.

**3. [Audit, Rule 2] Stock failure logging and the shared in-flight call,** as above.

## Human check pending

After merge and deploy: paste the JSON-LD from `/` and `/contact` into the Rich Results Test and validator.schema.org (code snippet mode). Open `/` on a mid-range phone and check that search, the latest cars and the review strip scroll smoothly.

## Known Stubs

Demo reviews (04-01) and the dealer-fact placeholders (04-02, 04-03), all labelled on the page and blocked from production by tests.

## Commits

| Task | Commit |
|------|--------|
| 1, 2 | 7253117 |
| audit | 7228a16 |
| summaries 04-01 to 04-03 | cd48569 |

## Self-Check: PASSED

- FOUND: page.tsx (`Latest arrivals`, `action="/used-cars"`, `dealerJsonLd(`, `absolute`, `We could not load the cars.`), SiteFooter (`aria-label="Footer"`, `/terms`, `tel:`), links.test.ts, home/navigation specs
- FOUND: commits 7253117, 7228a16 in HEAD
- PR: https://github.com/CristianGaudino/cartwright/pull/52 (open, base main, not a draft)
