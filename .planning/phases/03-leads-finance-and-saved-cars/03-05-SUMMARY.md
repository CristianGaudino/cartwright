---
phase: 03-leads-finance-and-saved-cars
plan: 05
subsystem: leads
status: complete
tags: [leads, email, cloudflare-email, unit-tests, tracer]
requires:
  - "03-01: getBindings().EMAIL"
  - "03-04: processLead, snapshotCar, buildLeadEmail, getDeps"
provides:
  - "LEAD_FROM_EMAIL and isProduction() in src/lib/site.ts (isProduction is the one reader of APP_ENV)"
  - "requireEnv(name) in src/lib/env.ts (server-only, read on use)"
  - "Real Cloudflare Email Service mailer in src/lib/leads/deps.ts"
  - "email.test.ts and the extended process.test.ts"
affects: [03-06, 03-08, 03-10, 03-11, 03-15]
tech-stack:
  added: []
  patterns: ["requireEnv read on use, error names the variable only"]
key-files:
  created: [src/lib/env.ts, src/lib/leads/email.test.ts]
  modified: [src/lib/site.ts, src/lib/leads/deps.ts, src/lib/leads/process.test.ts]
decisions:
  - "LEAD_FROM_EMAIL is a placeholder, leads@cgaudino.com, because 03-02 has not recorded the sending address (logged on #47)"
metrics:
  duration: 10m
  completed: 2026-11-06
estimate:
  tokens: 40000
actuals:
  tokens: 2400
  tasks: 2
  commits: 1
plan_head_before: 0c3d92bfa88b027c7c0569b040d54ebdced65e75
plan_head_after: d20e7fbc21073d51efeabe58b68c7170f09d01c4
---

# Phase 3 Plan 05: Real mailer and pipeline tests Summary

The real mailer sends each lead through the Worker's `EMAIL` binding from `LEAD_FROM_EMAIL` to the `LEAD_TO_EMAIL` secret, with the buyer's address in `replyTo` and `[DEMO]` on the subject unless `APP_ENV` is production. Unit tests now pin the email and pipeline rules, including the lead with no car.

## What was built

- `src/lib/site.ts`: `LEAD_FROM_EMAIL` (placeholder, swap comment) and `isProduction()`; `indexable` calls it, so APP_ENV is still read in one place. `DEALER_PHONE` and `DEALER_TEL` unchanged.
- `src/lib/env.ts`: `requireEnv(name)`, `server-only`, throws `Missing ${name}` with no value.
- `src/lib/leads/deps.ts`: the not-configured mailer is replaced by one that reads `getBindings().EMAIL` (throws `Missing binding EMAIL` if absent) and calls `send({ to: requireEnv("LEAD_TO_EMAIL"), from: LEAD_FROM_EMAIL, subject, text, replyTo? })`. Real deps get `demo: !isProduction()`.
- `email.test.ts` (4 tests): [DEMO] on and off, sentinel name, phone, email and message never in the subject, car page URL and consent version in the body, a car-less row has subject `Enquiry` and no car lines.
- `process.test.ts` (+8 tests): `snapshotCar(undefined, spy)` gives four nulls and never calls the spy; unknown and sold cars give null, a live car the provider's fields; forged `carTitle`/price fields are ignored; sold and unknown cars give failed/server with nothing stored; honeypot; repeated client ref; a mailer throwing `E_DAILY_LIMIT_EXCEEDED` gives ok, no markNotified and exactly one `console.error` line with only `leadId`, `type`, `outcome`.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads src/robots.test.ts` | exit 0 (email.test.ts and process.test.ts in the run) |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `PORT=3157 npx playwright test e2e/leads.spec.ts` | 3 passed |

## TDD note

Both tasks were written test-first, but every new test passed on the first run: `buildLeadEmail` (03-04) and `processLead` already behaved as the plan describes, so no production code in `email.ts` or `process.ts` changed. The tests now pin those rules for 03-11 and 03-15.

## Deviations from Plan

**1. [Precondition substitute] 03-02 not done.** Task 1's precondition (03-02-SUMMARY records the paid option and the from address) is unmet. Per the overnight instruction the real path is coded and tested with fakes: `LEAD_FROM_EMAIL` is a placeholder on the owner's Cloudflare domain (`leads@cgaudino.com`) with a comment to swap it; logged on #47 (https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6698729869). 03-01 recorded A2 as PASS, so the `send_email` binding exists and no fallback was needed. Real delivery is unverified until the domain is onboarded and `LEAD_TO_EMAIL` is set.

## For the owner

- Onboard the sending domain in Email Service (Workers Paid), then set `LEAD_FROM_EMAIL` in `src/lib/site.ts` to the address on it, and the `LEAD_TO_EMAIL` Worker secret.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 and 2 | d20e7fb | src/lib/site.ts, src/lib/env.ts, src/lib/leads/deps.ts, src/lib/leads/email.test.ts, src/lib/leads/process.test.ts |

One commit for the plan, per the overnight instruction (few finished commits).

## Self-Check: PASSED

- FOUND: src/lib/env.ts, src/lib/leads/email.test.ts
- FOUND: commit d20e7fb in HEAD
- `deps.ts` contains `LEAD_TO_EMAIL` and `getBindings`, no `Mailer not configured`
