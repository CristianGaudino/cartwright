---
phase: 03-leads-finance-and-saved-cars
plan: 16
subsystem: finance
status: complete
tags: [finance, car-page, links, pr, tracer]
requires:
  - "03-15: FinanceCalculator, FINANCE, quote()"
provides:
  - "Finance section on in-stock car pages (price in the calculator's range)"
  - "carSummary(car) in src/lib/stock/format.ts, used by BuyBox and the Finance section"
  - "financeable(price) in src/lib/finance/payment.ts"
  - "Finance links in the header (from 1024px) and footer; /finance in the sitemap and the CI worker list"
  - "The #9 pull request: https://github.com/CristianGaudino/cartwright/pull/51"
affects: ["#48 saved cars (SiteHeader, BuyBox conflicts)", "go-live: finance.config.ts placeholder must be replaced"]
tech-stack:
  added: []
  patterns: ["one car-summary builder so only summary fields cross into client components"]
key-files:
  created: []
  modified: ["src/app/used-cars/[slug]/page.tsx", src/components/car/BuyBox.tsx, src/lib/stock/format.ts, src/components/SiteHeader.tsx, src/components/SiteFooter.tsx, src/app/sitemap.ts, .github/workflows/ci.yml, e2e/finance.spec.ts, src/lib/leads/schema.ts, src/lib/leads/schema.test.ts, src/lib/finance/payment.ts, src/components/finance/FinanceCalculator.tsx, src/components/leads/FinanceFields.tsx]
decisions:
  - "No Finance section for a car priced outside 1,000 to 250,000; a car priced at or under the default deposit starts at no deposit (audit, logged on #47)"
  - "PR opened while #49 and #50 are open, carrying their commits, per the run instructions (plan said wait for #12)"
  - "A blank carId on a finance lead counts as no car"
metrics:
  duration: 45m
  completed: 2026-11-08
estimate:
  tokens: 40000
actuals:
  tokens: 4600
  tasks: 2
  commits: 3
plan_head_before: 278a424b069974cf0939fa5c449c765176fd25bf
plan_head_after: 3f93f167cdccd8cb1b5ebbf8d9ad0f6db8f3c44e
---

# Phase 3 Plan 16: Finance on car pages, links and the #9 PR Summary

Every in-stock car page has a Finance section after Equipment that works out a payment on the car's own price, with a secondary Apply for finance that sends the car with the application. /finance is linked from the header (from 1024px), the footer and the sitemap, CI checks the Worker serves it, and the #9 PR is open.

## What was built

- **Car page:** `{!isSold(car) && financeable(car.priceEur) && <section>}` with Heading `Finance` and `<FinanceCalculator car={{ ...carSummary(car), priceEur: car.priceEur }} />` in the column-1 stack (48px gap). Only the summary fields and the price reach the client.
- **carSummary:** one builder in `format.ts`; BuyBox's LeadActions uses it too.
- **Links:** header `Finance` between `Used cars` and `Sell your car`, hidden below 1024px; footer `Finance` after `Used cars`; sitemap `/finance`; ci.yml worker case `"/finance 200"`.
- **Schema:** `carId: given(carId.optional())`, so a blank id is no car (unit test).

## Verification

| Check | Result |
|-------|--------|
| `npm run lint; echo $?` | 0 |
| `npx tsc --noEmit` / `npm run typecheck` | 0 / 0 |
| `npm test` | 0, 21 files, 373 tests |
| `APP_ENV=production NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` | 0 |
| `APP_ENV=production PORT=3197 npm run e2e` (full suite, production build) | **149 passed**, exit 0 |
| Screenshots (Pixel 7 /finance, car page dialog, 1280px /finance) | badge, 2 by 2 grid from 640px, wells, accent Apply on /finance, car row in the dialog |

New E2E: the car page shows the car's price as text (no Price input), a monthly figure and a non-accent Apply; the dialog shows the car title and price; a sold car has no Finance heading or card; the header Finance link goes to /finance at 1280px, is hidden at 320px where the footer has it, with no sideways scroll.

## Pre-PR gate

1. **#12:** PR #50 (and #49 under it) still open. Per the run instructions the #9 PR is opened anyway against main; its body says it carries their commits until they merge. No rebase on main.
2. **Ponytail audit** of 03-15 and 03-16 plus callers and tests:
   - **Should fix 1, fixed:** a car outside 1,000 to 250,000 would show `Check the figures above.` with nothing to fix. Now no section (`financeable()` shared with `quote()`).
   - **Should fix 2, fixed:** a car priced at or under the 3,000 default deposit opened on the deposit error. It now starts at no deposit.
   - **Lean 3, fixed:** term options built twice; one list shared.
   - **Nice to have 4, left:** dealer email shows `self_employed` (as test drive times show `afternoon`). For the owner.
   - **Left by spec 5:** the result live region updates on each keystroke, per UI-SPEC. Check with VoiceOver on the demo.
3. Checks as above, all by exit code.
4. PR #51 opened ready for review, `Closes #9`, added to project 6; #9 and #51 moved to In Review. Body covers the placeholder figures, the dealer's wording, APR / 12 (A9), credit intermediary status (A12), the production guard, the #49/#50 commits and expected conflicts with #48.

## Deviations from Plan

**1. [Rule 1 - Bug, audit] Cheap and out-of-range car prices** handled as above. Logged on #47.

**2. [Run instruction] PR opened before #12 (PR #50) merged.** Logged on #47.

**3. [Rule 2] Blank carId on a finance lead** counts as no car, matching the other optional fields.

**4. [Lean] carSummary()** added to `format.ts` so BuyBox and the Finance section build the client summary the same way.

## Human check pending

On the deployed demo after merge: open a car page and /finance on a mid-range phone; type in each field and confirm the figures follow with no lag; send one finance application from each and confirm the `[DEMO] Finance application` email shows deposit, term and employment, and the car only for the car-page one. Check the live region with VoiceOver.

## Known Stubs

Finance figures remain the labelled placeholders from 03-15 (D-16) until the dealer supplies terms and wording.

## Threat Flags

None. T-03-49: only `carSummary` fields and `priceEur` cross into the client component.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | ec5fe45 | car page, BuyBox, format.ts, finance.spec |
| 2 | 138b6d5 | SiteHeader, SiteFooter, sitemap, ci.yml, finance.spec, schema and test |
| audit | 3f93f16 | payment.ts, car page, FinanceCalculator, FinanceFields |

## Self-Check: PASSED

- FOUND: `<FinanceCalculator` in an in-stock branch of `src/app/used-cars/[slug]/page.tsx`; `/finance` in SiteHeader, SiteFooter and sitemap; `/finance 200` in ci.yml; car-page and sold-car tests in e2e/finance.spec.ts
- FOUND: commits ec5fe45, 138b6d5, 3f93f16 in HEAD
- PR: https://github.com/CristianGaudino/cartwright/pull/51
