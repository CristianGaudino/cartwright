---
phase: 03-leads-finance-and-saved-cars
plan: 04
subsystem: leads
status: complete
tags: [leads, server-action, dialog, tracer]
requires:
  - "03-01: getBindings() (not used yet; 03-05 and 03-08 read it)"
provides:
  - "processLead(fd, ctx, deps) and snapshotCar(carId, getCar) in src/lib/leads/process.ts"
  - "submitLead server action in src/app/actions/lead.ts"
  - "leadSchema, CONSENT, LIMITS, TYPE_LABELS in src/lib/leads/schema.ts (client-safe)"
  - "logLead in src/lib/log.ts (id, type, outcome only)"
  - "getDeps() with E2E_FAKE_BACKENDS fakes in src/lib/leads/deps.ts"
  - "LeadForm, TextField, LeadDialog, LeadActions, CarSummary in src/components/leads/"
affects: [03-05, 03-06, 03-08, 03-09, 03-10, 03-11, 03-13, 03-15]
tech-stack:
  added: ["drizzle-orm ^0.45.4", "@neondatabase/serverless ^1.2.0", "zod ^4.6.7", "server-only ^0.0.1", "drizzle-kit ^0.31.11 (dev)", "@electric-sql/pglite ^0.5.9 (dev)"]
  patterns: ["injected Deps for the lead pipeline", "onSubmit + startTransition with controlled state (no form action)", "dialog stays mounted while closed"]
key-files:
  created: [src/lib/leads/schema.ts, src/lib/leads/process.ts, src/lib/leads/process.test.ts, src/lib/leads/email.ts, src/lib/leads/deps.ts, src/lib/log.ts, src/app/actions/lead.ts, src/components/leads/LeadForm.tsx, src/components/leads/LeadDialog.tsx, e2e/leads.spec.ts]
  modified: [package.json, package-lock.json, src/components/car/BuyBox.tsx, playwright.config.ts, e2e/car-page.spec.ts, e2e/gallery.spec.ts, e2e/stock.spec.ts]
decisions:
  - "Packages approved against vintage's lockfile (same version and sha512) because 03-02 is not done; logged on #47"
  - "A sold or unknown car refuses the lead with failed/server and logs outcome invalid, not error"
  - "A markNotified failure after a sent email counts as notify_failed (safe side)"
  - "Existing E2E price locators take the visible price, since the closed dialog repeats it"
metrics:
  duration: 50m
  completed: 2026-11-06
estimate:
  tokens: 70000
actuals:
  tokens: 8500
  tasks: 2
  commits: 2
plan_head_before: 9f6d54d9a0029156627954dd71a0030cd01d527e
plan_head_after: 8f8032cc748430729720640d1e314b26ad8337b3
---

# Phase 3 Plan 04: Enquiry tracer Summary

An enquiry goes from the Enquire button through a native sheet dialog, the shared controlled form, the `submitLead` server action and `processLead` to the store and the mailer, and the buyer sees "Thanks, we have your enquiry.", on in-memory fakes end to end.

## What was built

- **Lib slice (Task 1, tracer):** `processLead` reads only schema keys from the FormData, returns ok for a filled honeypot, validates with the zod enquiry branch, snapshots the car from the provider through `snapshotCar` (no carId gives four nulls without a lookup; unknown or sold refuses), checks `exists`, builds the row with a server id and `CONSENT.version`, inserts, and only on a true insert sends the text-only email inline and calls `markNotified`. One log line per request with only `leadId`, `type`, `outcome`.
- **UI slice (Task 2):** `LeadActions` puts Enquire (accent) and Call now (secondary, still `tel:` to the unchanged `DEALER_TEL`) in the 104px action area; `LeadDialog` is `dialog.sheet.lead`, never unmounted, Close is the first focusable element. `LeadForm` keeps values in state, submits through `startTransition`, shows field errors under fields and the send-failure, captcha and rate copy, and on success replaces the body with the focused thanks inside a polite live region, clears the values and renews `clientRef`. Closing the dialog after a success brings back a fresh form.

## Final LeadRow (for 03-06 Task 1)

```ts
export interface LeadRow {
  id: string;                 // server crypto.randomUUID()
  clientRef: string;          // uuid from the form, one per form instance
  type: LeadType;             // "enquiry" today
  carId: string | null;       // from the provider via snapshotCar, never from the form
  carSlug: string | null;
  carTitle: string | null;
  carPriceEur: number | null;
  sourcePath: string;         // validated pathname only
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  details: Record<string, string | number>; // {} for enquiry
  photoKeys: string[];        // [] until 03-13
  consentAt: Date;            // server time
  consentVersion: string;     // CONSENT.version, "2026-11-06"
}
```

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 2 tests (enquiry tracer, insert-returns-false) |
| `npx vitest run` (all) | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `npx playwright test` (all specs, production build, `PORT=3147` because 3000 was taken by the parallel executor) | 117 passed, 1 skipped (pre-existing) |
| `npx playwright test e2e/leads.spec.ts` | 3 passed |
| `git diff --quiet origin/main -- src/lib/site.ts` | exit 0 |
| `grep -c useActionState src/components/leads/LeadForm.tsx` | 0 |

Tracer gate: auto/end-of-phase mode, the automated verify was re-run after Task 1 and passed before the UI slice was built.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing E2E price locators matched twice**
- **Found during:** Task 2
- **Issue:** the closed enquiry dialog lives inside the buy box and shows the price in its car summary, so `getByTestId("buy-box").getByText(/^€[\d,]+$/)` hit two elements (strict mode).
- **Fix:** `.filter({ visible: true })` on that locator in car-page (2), gallery (1) and stock (1) specs.
- **Files modified:** e2e/car-page.spec.ts, e2e/gallery.spec.ts, e2e/stock.spec.ts
- **Commit:** 8f8032c

**2. [Precondition substitute] 03-02 not done**
- The Task 1 precondition (03-02-SUMMARY approved versions) could not be met. Per the overnight rule, each package was approved only because it matches vintage's lockfile exactly (version and integrity); logged on #47.

### Notes

- `TextField` is a small raw input helper in LeadForm.tsx; 03-09 replaces it with `Field`, `ContactFields` and `ConsentRow` and adds the error summary and focus moves.
- The desktop centred dialog (520px) and `/privacy` come in 03-10; the consent link points at `/privacy`, which is a 404 until then.
- npm held back the postinstall of esbuild@0.18.20 (a drizzle-kit dependency). Nothing runs drizzle-kit yet; 03-06 may need `npm install-scripts approve esbuild`.
- LED-01 and LED-02 are left unticked in REQUIREMENTS.md: the tracer covers their path on fakes, but LED-01 also needs the Neon store, spam checks and the real email (03-05 to 03-08).
- Commit trailers use `Claude Opus 5.5` to match the model and the earlier phase 3 commits (the brief said Sonnet 5.5).

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| src/lib/leads/deps.ts | real store and mailer | Throw "not configured" on purpose until 03-05 (mailer) and 03-06 (Neon store); `demo: true` until 03-05 wires `isProduction`. Outside E2E every lead fails loudly, never silently. |

## Threat Flags

None beyond the plan's register. T-03-07 (car from provider only), T-03-08 (logLead three keys, catches log nothing from the error), T-03-11 (fakes only on `E2E_FAKE_BACKENDS === "1"`, shortcut comment in deps.ts) and T-03-12 (pathname regex) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | d6b04cd | package.json, package-lock.json, src/lib/leads/{schema,process,process.test,email,deps}.ts, src/lib/log.ts, src/app/actions/lead.ts |
| 2 | 8f8032c | src/components/leads/{LeadForm,LeadDialog}.tsx, src/components/car/BuyBox.tsx, playwright.config.ts, e2e/leads.spec.ts, e2e/{car-page,gallery,stock}.spec.ts |

## Self-Check: PASSED

- FOUND: all 10 created files listed in key-files
- FOUND: commits d6b04cd, 8f8032c in HEAD
