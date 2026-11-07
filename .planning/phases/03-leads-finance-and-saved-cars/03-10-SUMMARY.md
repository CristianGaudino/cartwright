---
phase: 03-leads-finance-and-saved-cars
plan: 10
subsystem: leads
status: complete
tags: [test-drive, reserve, type-picker, dialog, footer, privacy, pr, tracer]
requires:
  - "03-08: Turnstile and limiter in the pipeline"
  - "03-09: Field, ContactFields, ConsentRow, error summary"
provides:
  - "test_drive and reserve schema branches, DETAIL_LABELS, details on the row and in the email"
  - "TypePicker and CarFields in src/components/leads/CarFields.tsx"
  - "Four-button action area and the type-aware lead dialog (LeadActions)"
  - "Centred dialog.sheet.lead from 640px"
  - "SiteFooter in the root layout; /privacy stub; /privacy in the sitemap"
  - "src/lib/leads/constants.ts: zod-free constants for client components (audit fix)"
  - "CI worker: /privacy 200 and the E2E_FAKE_BACKENDS guard"
  - "PR #49 for #11"
affects: [03-11, 03-12, 03-13, 03-15, 03-16, "#48 saved cars (footer link, rebase)"]
tech-stack:
  added: []
  patterns: ["one dialog per car with the type in LeadActions state", "client components import lead constants from constants.ts, never schema.ts"]
key-files:
  created: [src/components/leads/CarFields.tsx, src/components/SiteFooter.tsx, src/app/privacy/page.tsx, src/lib/leads/constants.ts]
  modified: [src/components/leads/LeadDialog.tsx, src/lib/leads/schema.ts, src/lib/leads/schema.test.ts, src/lib/leads/process.ts, src/lib/leads/process.test.ts, src/lib/leads/email.ts, src/lib/leads/email.test.ts, src/app/globals.css, src/app/layout.tsx, src/app/sitemap.ts, .github/workflows/ci.yml, e2e/leads.spec.ts, e2e/car-page.spec.ts, docs/lead-retention.md]
decisions:
  - "Deletion requests on /privacy go to DEALER_PHONE only until the dealer supplies a public email (Open Question 6); logged on #47"
  - "DEALER_PHONE stays the unconfirmed number published on cartwright.ie (Open Question 7); logged on #47"
  - "PR opened although DATABASE_URL and the other 03-02 secrets are missing (standing instruction); the PR body says do not merge until they exist"
  - "Tomorrow is computed in Europe/Dublin on both client and server"
  - "Footer has no top margin of its own: pages already end with 64px padding"
metrics:
  duration: 70m
  completed: 2026-11-07
estimate:
  tokens: 90000
actuals:
  tokens: 4600
  tasks: 2
  commits: 4
plan_head_before: 69bd43b160e7a26ec7877d6dfe58de1c5854fdc1
plan_head_after: 8c8b6d78329e3d795dd8b1607f061b05835e52eb
---

# Phase 3 Plan 10: Test drive, reserve, centred dialog, footer and /privacy Summary

Enquire, Test drive and Reserve now open one dialog, with a type picker that keeps what was typed. The action area holds four buttons in its 104px. From 640px the dialog is a centred 520px panel. Every page has a footer, and the consent link leads to a real `/privacy` page. The #11 PR is open: https://github.com/CristianGaudino/cartwright/pull/49

## What was built

- **Schema:** `test_drive` adds `preferredDay`, an ISO date from tomorrow in Irish time, and `preferredTime` (`any`, `morning` or `afternoon`, default `any`). `reserve` has no extra fields; unknown keys are dropped. `TYPE_LABELS` gains `Test drive request` and `Reservation request`. `DETAIL_LABELS` drives both what reaches `details` (only its own keys, and only when set) and the order of the email's detail lines.
- **CarFields:** `TypePicker` is the Phase 1 segmented control, a `radiogroup` of native radios under the legend `What would you like to do?`. `CarFields` adds, for test drive only, a date input (`min` tomorrow), a time select and `We will call to confirm a time.`
- **LeadActions:** Enquire (accent) and Call now in row 1, Test drive and Reserve in row 2. All are 48px with no wrapping. Each form button records itself as the opener and sets the type. Title, submit label, thanks and the Message or Note label follow the type. Reserve shows the not-a-hold hint above the contact fields.
- **CSS:** `dialog.sheet.lead` from 640px is `inset: 0; margin: auto`, 520px wide, `max-height: min(90dvh, 720px)`, 16px radius and `shadow-lift`. It opens and closes with opacity and `scale(0.97)` over 200ms ease-out, using `@starting-style` and `allow-discrete`. Reduced motion uses opacity only over 150ms. Scroll lock and contrast come from the existing `dialog.sheet` rules.
- **SiteFooter:** ink surface, hairline top, 24px padding, wrapping 44px links `Used cars` and `Privacy policy`, after `children` in the root layout.
- **/privacy:** sections on what we collect, why we use it (Cloudflare and Neon in Frankfurt named), how long we keep it (`LEAD_RETENTION_MONTHS` months, "still confirming"), and how to ask for deletion (the `DEALER_PHONE` tel link). It never shows `LEAD_TO_EMAIL`. It is listed in the sitemap.
- **CI worker job:** `"/privacy 200"`, and a grep that fails if `E2E_FAKE_BACKENDS` appears in `wrangler.jsonc` or `deploy.yml` (T-03-26).

## Pre-PR gate

1. `git fetch`: `origin/main` is still `ff1f10e` (the branch base), so no rebase was needed. #48 is open, so no `Saved cars` footer link was added.
2. **Ponytail audit** on the whole branch against main: no must-fix findings. Fixed: zod went to every car page (131 KB chunk, 38 KB gzipped) because client components imported constants from `schema.ts`. They now import from `constants.ts`, and `invalid_union` no longer appears in `.next/static/chunks`. Left for the owner (in the PR): the rate limit counts typo round trips (plan order); a stale summary link after a type switch; the unused `PhotoBucket` type (03-13 uses it).
3. Checks: `npm run lint; echo $?` 0, `npx tsc --noEmit` 0, `npm run typecheck` 0, `npm test` 0 (17 files, 310 tests), `drizzle-kit check` 0, `check-migrations.sh main` 0, `APP_ENV=production NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` 0, `APP_ENV=production PORT=3167 npm run e2e` **128 passed**.
4. Secrets: `gh secret list` shows no `DATABASE_URL`. `wrangler secret list` was not run (needs Cloudflare auth on this machine). The sending domain is not onboarded. Per the standing instruction the PR was opened anyway, with "Do not merge yet" at the top of the body.
5. PR #49 against main, ready for review, `Closes #11`, with the audit, the E2E result and every owner note the plan lists.
6. #11 and PR #49 moved to In Review on project 6.

## Deviations from Plan

**1. [Instruction override] Verification step 4 said stop if secrets are missing.** The orchestrator's standing instruction said open the PR with the caveat. Done, and logged on #47 (https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6699128922).

**2. [Rule 1 - Perf, audit] constants.ts** split out of `schema.ts`. Imports updated in the client components, the tests, `process.ts`, `/privacy`, the e2e spec and `docs/lead-retention.md`. 03-11 and later should import constants from there.

**3. [Rule 1] Tomorrow in Europe/Dublin,** so the form's `min` and the server agree near midnight (unit test at 23:30 UTC in winter and summer).

**4. [Discretion] No footer top margin** (pages end with 64px padding already; adding 64px more would leave 128px).

## Human check (end of phase)

On the deployed demo, after provisioning: send a real enquiry, test drive and reserve. A `[DEMO]` email should arrive and the Neon row should have `notified_at` set. Check the phone sheet (header and Send stay put, the keyboard does not cover the field) and the desktop fade and scale.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| src/app/privacy/page.tsx | whole page | Stub copy; Phase 4 replaces the copy, not the route. Retention and deletion contact are dealer placeholders |
| src/lib/site.ts | DEALER_PHONE | Unconfirmed published number (Open Question 7) |

## Threat Flags

None beyond the plan's register. T-03-23 (zod branches, ISO date, enum, only known keys reach details), T-03-24 (no LEAD_TO_EMAIL on /privacy, grep 0), T-03-25 (no buttons on sold cars, e2e) and T-03-26 (CI grep) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | a93f7ee | CarFields, LeadDialog, schema, process, email, their tests, leads and car-page specs |
| 2 | b544faa | globals.css, SiteFooter, layout, privacy page, sitemap, ci.yml, leads spec |
| audit | 8c8b6d7 | constants.ts and its importers, docs/lead-retention.md |

## Self-Check: PASSED

- FOUND: CarFields.tsx (radiogroup, What would you like to do?, We will call to confirm a time.), LeadDialog.tsx (reserve hint, Book a test drive), schema.ts (test_drive, reserve, DETAIL_LABELS), email.ts (DETAIL_LABELS), globals.css (dialog.sheet.lead, 520px), layout.tsx (<SiteFooter), privacy page (LEAD_RETENTION_MONTHS, DEALER_PHONE, Neon, Cloudflare; LEAD_TO_EMAIL count 0), sitemap.ts (/privacy), ci.yml (/privacy 200, E2E_FAKE_BACKENDS)
- FOUND: commits a93f7ee, b544faa, 8c8b6d7 in HEAD
- FOUND: PR https://github.com/CristianGaudino/cartwright/pull/49
