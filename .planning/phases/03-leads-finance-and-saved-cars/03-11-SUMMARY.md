---
phase: 03-leads-finance-and-saved-cars
plan: 11
subsystem: leads
status: complete
tags: [sourcing, trade-in, form-page, tracer]
requires:
  - "03-09: Field, ContactFields, ConsentRow, error summary"
  - "03-10: constants.ts, SiteFooter, the four-type pipeline"
provides:
  - "LeadPage frame with the Prefer to talk card"
  - "LeadForm page variant (no scroll area, 240px-minimum submit from 640px, Back to used cars on success)"
  - "LeadPageForm: the client wrapper a server page uses to render LeadForm with a field set"
  - "SourcingFields, TradeInFields; /find-a-car and /sell-your-car"
  - "sourcing and trade_in schema branches (no carId key), TYPE_LABELS, DETAIL_LABELS"
  - "Field: suffix prop (km) and autoCapitalize, spellCheck, placeholder"
  - "BUDGETS in src/lib/stock/types.ts"
affects: [03-12, 03-13, 03-14]
tech-stack:
  added: []
  patterns: ["server pages render LeadPageForm with serialisable props; the field set is picked by type on the client"]
key-files:
  created: [src/components/leads/LeadPage.tsx, src/components/leads/LeadPageForm.tsx, src/components/leads/SourcingFields.tsx, src/components/leads/TradeInFields.tsx, src/app/find-a-car/page.tsx, src/app/sell-your-car/page.tsx, e2e/sourcing.spec.ts, e2e/trade-in.spec.ts]
  modified: [src/components/leads/LeadForm.tsx, src/components/leads/Field.tsx, src/components/stock/StockFilters.tsx, src/lib/stock/types.ts, src/lib/leads/schema.ts, src/lib/leads/schema.test.ts, src/lib/leads/process.ts, src/lib/leads/process.test.ts]
decisions:
  - "BUDGETS lives in src/lib/stock/types.ts, not exported from StockFilters.tsx: the server schema reads it, and a value from a use client file is only a client reference on the server; logged on #47"
  - "LeadPageForm picks the fields by type because a server page cannot pass LeadForm's render function; logged on #47"
  - "Year error copy (not in the UI-SPEC): Enter the year as 4 digits. / Enter a year from 1980 to {next year}."
  - "Budget error copy (forged values only, the select cannot send one): Choose a budget from the list."
metrics:
  duration: 45m
  completed: 2026-11-07
estimate:
  tokens: 65000
actuals:
  tokens: 7300
  tasks: 2
  commits: 2
plan_head_before: 4d4dddce490e98deb74ce554b2da4ffbd1a77293
plan_head_after: cda5eb67acf958d1945b40a35bca5857d1afa30a
---

# Phase 3 Plan 11: Find a car and sell your car pages Summary

/find-a-car and /sell-your-car send sourcing and trade-in leads through the same LeadForm, server action and pipeline as the car dialog, and both are stored with no car: tests prove `getCar` is never called and a forged carId is dropped.

## What was built

- **Schema:** `sourcing` has optional make and model (max 60), an optional `budgetMax` that must be one of the Budget filter steps (stored as a number), and a required message (`Tell us what you are looking for.`). `trade_in` has `reg` (trimmed, upper case, letters, digits, hyphens and spaces, 1 to 12), `mileage` (commas stripped, 0 to 999,999, stored as a number), optional make, model and `year` (1980 to next year). Neither branch has a `carId` key. `TYPE_LABELS` gains `Find a car request` and `Trade-in valuation` (no reg in the subject). `DETAIL_LABELS` gains reg, mileage (km), make, model, year and budget, which also makes `processLead` read those keys.
- **process.ts:** one line, `"carId" in input ? input.carId : undefined`, because the union now has types without the key. `snapshotCar` itself was already right.
- **LeadPage:** 48px top, Display h1, intro at 65ch, the form column capped at 640px, and a card `Prefer to talk?` with the `DEALER_PHONE` tel link: beside the form (320px, 32px gap) from 1024px, under it below.
- **LeadForm page variant:** the body is not a scroll area, the submit is full width on phones and auto with a 240px minimum from 640px, and on success the action is a secondary `Back to used cars` link. Dialog behaviour unchanged (leads.spec 12 passed).
- **Field:** a `suffix` prop puts `km` inside the input in Meta secondary and adds it to `aria-describedby`; `autoCapitalize`, `spellCheck` and `placeholder` pass through.
- **Pages:** titles `Find a car` and `Sell your car in Tralee`; copy exactly as the UI-SPEC Copywriting Contract.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 77 tests |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` | exit 0 |
| `PORT=3177 npx playwright test e2e/trade-in.spec.ts e2e/sourcing.spec.ts e2e/leads.spec.ts` | 16 passed |
| Screenshots of /sell-your-car at 390px and 1280px | form column, km suffix, card beside (desktop) and under (phone) the form |

Tracer gate (Task 1): the automated verify passed before Task 2 started. TDD (Task 2): schema and process tests ran red (14 failures), then green. One test was wrong (`191-KY-12345` is 12 characters, so valid); it now uses a 13-character reg.

## Deviations from Plan

**1. [Rule 1 - Bug] BUDGETS is in `src/lib/stock/types.ts`, not exported from `StockFilters.tsx`.** The plan's acceptance grep (`export const BUDGETS` in StockFilters.tsx) does not match. Importing a value from a `"use client"` module into the server schema gives a client reference, not the array, so the budget check would break on the server. StockFilters imports it from types.ts; the steps are unchanged. Logged on #47.

**2. [Rule 3 - Blocking] `LeadPageForm` added.** LeadForm takes its fields as a render function, which a server page cannot pass to a client component. The pages pass `type`, `submitLabel` and `success` (all serialisable) and LeadPageForm picks `SourcingFields` or `TradeInFields`. Each field set therefore includes `ContactFields` (and, for trade-in, the message) in UI-SPEC order. page.tsx still holds `type="sourcing"` / `type="trade_in"` and the copy, so those acceptance greps pass. Logged on #47.

**3. [Discretion] Sourcing E2E** fills name, phone and consent before the first send, so the summary is about the missing message alone.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| src/lib/site.ts | DEALER_PHONE | Unconfirmed published number on the Prefer to talk card (Open Question 7, recorded in 03-10) |

## Threat Flags

None beyond the plan's register. T-03-27 (zod branches with patterns, ranges, max lengths and the budget allow-list; no carId key, forged one dropped, tested), T-03-28 (same pipeline: honeypot, limiter, Turnstile) and T-03-29 (subject from TYPE_LABELS only, tested for trade-in) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 02800fd | types.ts, StockFilters, schema, process, both tests, Field, LeadForm, LeadPage, LeadPageForm, SourcingFields, find-a-car page, sourcing spec |
| 2 | cda5eb6 | schema, both tests, TradeInFields, LeadPageForm, sell-your-car page, trade-in spec |

## Self-Check: PASSED

- FOUND: all created files in key-files
- FOUND: commits 02800fd, cda5eb6 in HEAD
- FOUND: find-a-car/page.tsx (`type="sourcing"`, `Ask us to find it`), sell-your-car/page.tsx (`type="trade_in"`, `Get my valuation`), schema.ts (`sourcing`, `trade_in`, the three error strings), LeadPage.tsx (`Prefer to talk?`, `DEALER_TEL`), TradeInFields.tsx (`191-KY-1234`, `inputMode="numeric"`)
