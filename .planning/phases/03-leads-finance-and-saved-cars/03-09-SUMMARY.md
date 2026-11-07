---
phase: 03-leads-finance-and-saved-cars
plan: 09
subsystem: leads
status: complete
tags: [validation, consent, a11y, error-summary, tracer]
requires:
  - "03-08: LeadForm with Turnstile, stubTurnstile"
provides:
  - "Field and ContactFields in src/components/leads/Field.tsx"
  - "ConsentRow in src/components/leads/ConsentRow.tsx"
  - "Error summary and send-failure alert in LeadForm"
  - "CONTACT_ERROR and the exact UI-SPEC error copy; schema.test.ts"
affects: [03-10, 03-11, 03-15]
tech-stack:
  added: []
  patterns: ["input fill from the container via Tailwind in-[dialog]:bg-surface", "summary order taken from form.elements at submit time"]
key-files:
  created: [src/components/leads/Field.tsx, src/components/leads/ConsentRow.tsx, src/lib/leads/schema.test.ts]
  modified: [src/lib/leads/schema.ts, src/components/leads/LeadForm.tsx, src/components/leads/LeadDialog.tsx, e2e/leads.spec.ts]
decisions:
  - "Summary links read the field's error message (Enter your name.), not its label, so no label lookup is needed and the link says what to do"
  - "Phone needs at least 7 digits; a run of hyphens or brackets no longer passes"
metrics:
  duration: 20m
  completed: 2026-11-06
estimate:
  tokens: 45000
actuals:
  tokens: 3700
  tasks: 1
  commits: 1
plan_head_before: 9d27ace92654446ca7f8f8ab5e85d75f73a873a9
plan_head_after: 69bd43b160e7a26ec7877d6dfe58de1c5854fdc1
---

# Phase 3 Plan 09: Field errors, consent row and failure alert Summary

A failed send now shows a focused `Check these details` summary with one link per invalid field, in form order. Each field carries its own message, border and `aria-invalid`. The send never clears what was typed, and consent is a single unticked row that links `/privacy`.

## What was built

- `schema.ts`: `CONTACT_ERROR`. Phone is one refine (allowed characters plus at least 7 digits), so a bad phone gives exactly one message. The rest of the copy was already exact.
- `Field`: visible label (with `(optional)` in Meta secondary), and a 48px input, a 112px textarea with no resize handle, or a native select with the chevron. Fill is card on a page and ink inside a dialog (`in-[dialog]:bg-surface`). The helper and error lines are wired through `aria-describedby`. `invalid` and `describedBy` let Phone share the one contact error.
- `ContactFields`: Name, the Meta line, Phone (`tel`) and Email (`email`), all with `enterKeyHint="next"`. When the contact error is set, both fields get the error border, and the message shows once under Email.
- `ConsentRow`: a native 20px checkbox in a 44px row, the `CONSENT.text`, and `Privacy policy` opening in a new tab with a visually hidden suffix. Its value lives in the form's values (`yes` or empty), so a success clears it with everything else.
- `LeadForm`: the summary (`role="alert"`, h3 `tabIndex={-1}` focused on every failed submit, replaced not stacked). Each link focuses its field. The failure alert has a destructive first line and the dealer's `tel:` link. Only fixed copy and our own zod messages ever render (T-03-45). `TextField` is gone.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 55 tests (schema.test.ts 14) |
| `npm run typecheck`, `npm run lint` | exit 0 |
| build with the test site key | exit 0 |
| `PORT=3167 npx playwright test e2e/leads.spec.ts` | 6 passed |

TDD: schema.test.ts ran red (3 failures: the contact constant, and phones made only of hyphens or brackets), then green.

## Deviations from Plan

**1. [Discretion] Summary link text is the error message,** for example `Enter your name.`, which tells the buyer what to do (GOV.UK pattern). The UI-SPEC asks for one link per field and does not fix the wording.

**2. [Discretion] Summary card border is hairline,** because the UI-SPEC reserves destructive for error text, error borders and the summary heading.

## Known Stubs

None. DEALER_PHONE is the unconfirmed published number, a recorded placeholder decision (see 03-10).

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 69bd43b | schema.ts, schema.test.ts, Field.tsx, ConsentRow.tsx, LeadForm.tsx, LeadDialog.tsx, e2e/leads.spec.ts |

## Self-Check: PASSED

- FOUND: Field.tsx (aria-describedby, aria-invalid), ConsentRow.tsx (/privacy, noopener, opens in a new tab, one checkbox), LeadForm.tsx (Check these details, role="alert", DEALER_TEL)
- FOUND: commit 69bd43b in HEAD
