---
phase: 03-leads-finance-and-saved-cars
plan: 08
subsystem: leads
status: complete
tags: [turnstile, rate-limit, honeypot, logging, consent, tracer]
requires:
  - "03-01: getBindings().LEAD_LIMITER (A3 PASS), Turnstile slot sizing (A4 PASS)"
  - "03-04 to 03-06: processLead, Deps, LeadForm, logLead, requireEnv, CONSENT"
provides:
  - "verifyTurnstile(token, ip, secret) in src/lib/leads/turnstile.ts (fail closed, action lead)"
  - "Deps.limiter and Deps.verifyTurnstile; real ones in deps.ts, fakes allow and take any non-empty token"
  - "useTurnstile(slot) in src/components/leads/useTurnstile.ts"
  - "stubTurnstile(page, { pass }) in e2e/turnstile.ts"
  - "no-logging.test.ts (D-08 sentinel), consent.test.ts (D-06 frozen wording), no-console lint on the lead paths"
affects: [03-09, 03-10, 03-11, 03-13, 03-15]
tech-stack:
  added: []
  patterns: ["Turnstile script loaded on first focusin inside the dialog or form", "form element kept mounted after success so the widget survives"]
key-files:
  created: [src/lib/leads/turnstile.ts, src/lib/leads/turnstile.test.ts, src/components/leads/useTurnstile.ts, e2e/turnstile.ts, src/lib/leads/no-logging.test.ts, src/lib/leads/consent.test.ts]
  modified: [src/lib/leads/process.ts, src/lib/leads/deps.ts, src/lib/leads/process.test.ts, src/lib/leads/process.int.test.ts, src/components/leads/LeadForm.tsx, e2e/leads.spec.ts, eslint.config.mjs, .github/workflows/ci.yml, .github/workflows/deploy.yml]
decisions:
  - "deploy.yml uses Cloudflare's always-pass test site key as a marked PLACEHOLDER until 03-02 creates the widget; leads fail closed on the demo until both real keys exist (logged on #47)"
  - "The widget is reset after any answer that may have spent the token (ok, server, captcha, network), not after a field error or rate limit, which the server answers before checking it"
metrics:
  duration: 25m
  completed: 2026-11-06
estimate:
  tokens: 65000
actuals:
  tokens: 5200
  tasks: 2
  commits: 1
plan_head_before: 5eb688b22be2776c1f1184f2e391fb1426fd0c99
plan_head_after: 9d27ace92654446ca7f8f8ab5e85d75f73a873a9
---

# Phase 3 Plan 08: Turnstile, rate limit and no-logging Summary

Leads now pass a honeypot, a 5-a-minute per-IP limit, field validation and a fail-closed Turnstile check, in that order. The Turnstile script loads only when the dialog opens. A sentinel test and a lint rule prove that no lead payload reaches a log.

## What was built

- `processLead` order: honeypot, then `limiter.allow(ip)` (gives `failed`/`rate`), then zod, then `verifyTurnstile(cf-turnstile-response, ip)` (gives `failed`/`captcha`), then the existing car, duplicate, insert and mail steps. The limiter and verify calls sit inside the try, so a missing binding or secret logs one `error` line rather than vanishing in the action's catch.
- `turnstile.ts`: no request for an empty token or one over 2048 characters. It POSTs secret, response and remoteip (when known) to siteverify, and accepts only `success === true && action === "lead"`. A throw or bad JSON gives false.
- `deps.ts`: the real limiter calls `LEAD_LIMITER.limit({ key })` and throws `Missing binding LEAD_LIMITER` off the Worker (03-01 recorded A3 as a pass, so no shortcut was needed). The real verify uses `requireEnv("TURNSTILE_SECRET_KEY")`.
- `useTurnstile`: injects `api.js?render=explicit` once per page, then renders a Managed `interaction-only` widget with `execution: "render"` and `action: "lead"`. Callbacks set or clear the token; `reset()` and unmount `remove()`.
- `LeadForm`: listens for `focusin` on its dialog (showModal focuses Close) or on the form, and appends the token. The `<form>` element now stays mounted in the success state, with the slot between the body and the footer, so the widget survives for the next request.
- `e2e/turnstile.ts` routes every `challenges.cloudflare.com` request to a stub. A new spec proves no Cloudflare request before the dialog opens, and that a failed check shows `We could not check this request.` and keeps the typed name.
- CI `worker` and `e2e` jobs set `NEXT_PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000BB`. `deploy.yml` sets the same key as a placeholder (see Deviations).
- `no-logging.test.ts` covers 10 outcomes: stored, duplicate, invalid, captcha, rate, honeypot, sold, a Drizzle-shaped insert error with the payload in message, params and cause (`code: ZZ_SENTINEL_CODE`), a mailer error with `E_DAILY_LIMIT_EXCEEDED` and the email in its message (`notify_failed`), and getCar throwing. It spies every console method and both process streams, then asserts no sentinel appears and exactly one logLead line with only `leadId`, `type` and `outcome`. Mutation check: adding `process.stderr.write(String(e))` to the catch fails 2 cases.
- `consent.test.ts`: a frozen map of version to text.
- `eslint.config.mjs`: `"no-console": "error"` for `src/lib/leads/**`, `src/components/leads/**` and `src/app/actions/**`. `src/lib/log.ts` is outside that scope on purpose.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 41 tests |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` | exit 0 |
| `PORT=3167 npx playwright test e2e/leads.spec.ts` | 4 passed |
| `grep -c 1x00000000000000000000BB .github/workflows/ci.yml` | 2 |

TDD: `no-logging.test.ts` and `consent.test.ts` were green on the first run, because 03-04 and 03-05 already log only the three keys. The mutation check above shows the sentinel test fails when a leak is added.

Tracer gate: auto mode. The automated verify was re-run after Task 1 and passed before Task 2.

## Deviations from Plan

**1. [Precondition substitute] 03-02 has no Turnstile site key.** Per the overnight instruction, `deploy.yml` carries Cloudflare's always-pass test site key, marked PLACEHOLDER with a comment. A real secret refuses test-key tokens, so the demo fails closed rather than accepting bots. Logged: https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6698901839

**2. [Rule 1 - Bug avoided] Reset only after answers that may spend the token.** The plan says reset after every non-ok result. But a field error and a rate limit are answered before siteverify, so the token is still good. Resetting there would make a quick corrected retry fail the bot check. Logged on #47 with the one-line undo.

**3. [Rule 3] LeadForm keeps one `<form>` element in both states.** Without it, the success state removes the slot's DOM node, and the next request would have no widget.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| .github/workflows/deploy.yml | NEXT_PUBLIC_TURNSTILE_SITE_KEY | Test key placeholder until the owner creates the Managed widget (03-02) |

## Threat Flags

None beyond the plan's register. T-03-18 to T-03-22 are in place. T-03-21 (third-party script) is accepted: it loads only from challenges.cloudflare.com, and only after a form gets focus.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 and 2 | 9d27ace | the 15 files above |

## Self-Check: PASSED

- FOUND: turnstile.ts, turnstile.test.ts, useTurnstile.ts, e2e/turnstile.ts, no-logging.test.ts, consent.test.ts
- FOUND: commit 9d27ace in HEAD
