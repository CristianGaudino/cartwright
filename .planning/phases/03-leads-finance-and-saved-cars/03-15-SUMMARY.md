---
phase: 03-leads-finance-and-saved-cars
plan: 15
subsystem: finance
status: complete
tags: [finance, calculator, placeholder, application, tracer]
requires:
  - "03-04 to 03-14: LeadDialog, LeadForm, Field, ContactFields, leadSchema, snapshotCar, process.test.ts fakes, stubTurnstile"
provides:
  - "quote(price, deposit, term, apr) in integer cents, null for invalid input (src/lib/finance/payment.ts)"
  - "FINANCE PLACEHOLDER config with a production guard test (D-16)"
  - "FinanceCalculator card with the Placeholder figures badge, notice and Apply for finance"
  - "/finance page"
  - "finance lead type: deposit, term, employment, optional car (D-17); EMPLOYMENT in constants.ts"
  - "FinanceFields; LeadForm prefill prop; Field prefix and data-wells input fill"
affects: [03-16, "#20 admin inbox (finance leads)"]
tech-stack:
  added: []
  patterns: ["LeadForm prefill: a new object merges into the form values during render (no effect)", "calculator keystrokes refused unless they keep a number, so no NaN reaches quote()"]
key-files:
  created: [src/lib/finance/payment.ts, src/lib/finance/payment.test.ts, src/lib/finance/finance.config.ts, src/lib/finance/finance.config.test.ts, src/components/finance/FinanceCalculator.tsx, src/app/finance/page.tsx, src/components/leads/FinanceFields.tsx, e2e/finance.spec.ts]
  modified: [src/lib/leads/schema.ts, src/lib/leads/schema.test.ts, src/lib/leads/process.test.ts, src/lib/leads/constants.ts, src/components/leads/Field.tsx, src/components/leads/LeadForm.tsx]
decisions:
  - "Deposit is required in the application (UI-SPEC does not mark it optional), with new copy 'Enter the deposit in euros, numbers only.'; term error 'Choose a term from the list.'; employment select starts on 'Choose one' (logged on #47)"
  - "LeadDialog.tsx needed no change: its shell already takes any form and title; the finance dialog is composed in FinanceCalculator"
  - "Calculator inputs refuse keystrokes that would not make a number (digits, one decimal for APR), so the copy contract's three errors cover every case"
metrics:
  duration: 50m
  completed: 2026-11-08
estimate:
  tokens: 70000
actuals:
  tokens: 7800
  tasks: 2
  commits: 2
plan_head_before: 6dc0386bf8ebd246d9a07c4b81c37640e9c00857
plan_head_after: 278a424b069974cf0939fa5c449c765176fd25bf
---

# Phase 3 Plan 15: Finance calculator and application Summary

A buyer on /finance works out a representative monthly payment as they type, with every figure under a `Placeholder figures` badge and the representative notice, and applies through the shared lead dialog with deposit and term carried over. The application is stored as a `finance` lead with deposit, term and employment only, with or without a car.

## What was built

- **payment.ts:** `quote()` per research section 7. Integer cents, monthly rate APR / 12, rounded once; total and interest derived from the rounded monthly cents; APR 0 divides by the term. Null for price outside 1,000 to 250,000, negative or NaN deposit, nothing borrowed, APR outside 0 to 30, or a term that is not a positive integer.
- **finance.config.ts:** `PLACEHOLDER` comment, `placeholder: true`, defaults 15,000 / 3,000 / 48 / 9.9, terms 12 to 60, the placeholder notice. **finance.config.test.ts:** in production the flag must be false; a second test stubs APP_ENV to production and proves the guard throws on a placeholder config and passes otherwise.
- **FinanceCalculator:** `#1A1A1E` card, hairline, 16px radius, 16/24px padding, `data-wells` so inputs read as `#0E0E10` wells. The badge (Sold badge shape) shows while `FINANCE.placeholder`. A 2 by 2 grid from 640px: Price (`€` prefix, only without a car), Deposit (`€`), Term (select), APR (`%`). A polite `role="status"` result: `Representative monthly payment`, `€{n} a month` (Display, tabular), then Amount borrowed, Total to repay, Interest right aligned; `Check the figures above.` while anything is invalid. Inline errors per the copy contract. The notice in Meta secondary. `Apply for finance` (48px; accent without a car, secondary with one) opens `LeadDialog` titled `Apply for finance` with `LeadForm type="finance"`, deposit and term prefilled.
- **/finance:** metadata title `Car finance calculator`, h1 `Finance`, the intro, the calculator.
- **Schema:** `finance` branch with `carId` optional, `deposit` (commas stripped, whole number 0 to 250,000), `term` (one of `FINANCE.terms`), `employment` (enum, `Choose an employment status.`). `TYPE_LABELS.finance = "Finance application"`; `DETAIL_LABELS` gains deposit, term, employment, so the known-keys pick in `processLead` reads them and nothing else.
- **FinanceFields:** contact fields, Deposit, Term, the D-17 line, Employment status, `Anything else we should know? (optional)`.
- **LeadForm:** `prefill` prop. A new prefill object merges into the values during render, so each Apply refreshes deposit and term and keeps the rest.
- **Field:** `prefix` (described with the field, like `suffix`) and `in-data-wells:bg-surface`.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads src/lib/finance` | 117 passed (RED first: 6 failing finance tests before the schema branch) |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY=... npm run build && npx playwright test e2e/finance.spec.ts e2e/leads.spec.ts` (PORT=3197) | 15 passed |
| Acceptance greps (`PLACEHOLDER`, `placeholder: true`, `304.22`, `250`, `isProduction`, `Placeholder figures`, `Representative monthly payment`, `Check the figures above.`, `role="status"`, `Apply for finance`, `type="finance"`, D-17 line, `Choose an employment status.`) | all present |
| `grep -riE "low rate|approved" src/components/finance src/app/finance` | nothing |

## TDD Gate Compliance

Task 2 (tdd): the schema and processLead tests were written first and failed (6 failures: finance branch missing), then the schema branch made them pass. Committed together as one task commit (`278a424`).

## Deviations from Plan

**1. [Rule 2 - Missing copy] Deposit and term errors.** The plan names only the employment error. A required deposit and a term from the list need messages: `Enter the deposit in euros, numbers only.` and `Choose a term from the list.` Logged on #47.

**2. [Plan note] LeadDialog.tsx unchanged.** Its shell already takes a title and any form; the finance mode is composed in `FinanceCalculator`.

**3. [Rule 3] e2e locators scoped to the calculator card**, because the closed dialog's Deposit and Term fields stay in the DOM.

## Known Stubs

The finance figures are intentional placeholders (D-16): `src/lib/finance/finance.config.ts` defaults, terms and notice, with the visible badge and the production guard test. They wait for the dealer's terms and wording (#9).

## Threat Flags

None beyond the register. T-03-36 (badge, notice, guard test, no other claims), T-03-37 (known-keys pick drops income, date of birth and bank fields; unit tests on schema and pipeline) and T-03-38 (zod term list, deposit range, employment enum) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | bce7292 | payment, finance.config and tests, FinanceCalculator, /finance, Field, finance.spec |
| 2 | 278a424 | schema and tests, process.test, constants, FinanceFields, LeadForm, FinanceCalculator, finance.spec |

## Self-Check: PASSED

- FOUND: src/lib/finance/payment.ts, payment.test.ts, finance.config.ts, finance.config.test.ts, src/components/finance/FinanceCalculator.tsx, src/app/finance/page.tsx, src/components/leads/FinanceFields.tsx, e2e/finance.spec.ts
- FOUND: commits bce7292, 278a424 in HEAD
