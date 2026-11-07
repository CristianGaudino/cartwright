---
phase: 03-leads-finance-and-saved-cars
plan: 01
subsystem: leads-infrastructure
status: complete
tags: [spike, wrangler, bindings, server-action, turnstile, decision]
requires: []
provides:
  - "wrangler.jsonc send_email EMAIL and ratelimits LEAD_LIMITER bindings"
  - "src/lib/leads/bindings.ts getBindings()"
  - "Photo transport decision: action-formdata with research caps"
  - "03-UI-SPEC amended to the chosen transport"
affects: [03-04, 03-05, 03-06, 03-10, 03-13, 03-14]
tech-stack:
  added: []
  patterns: ["getCloudflareContext() in try/catch returning {} outside the Worker", "hand-written structural binding types"]
key-files:
  created: [src/lib/leads/bindings.ts]
  modified: [wrangler.jsonc, .planning/phases/03-leads-finance-and-saved-cars/03-UI-SPEC.md]
decisions:
  - "Photo transport is action-formdata: photos in the lead server action FormData, caps 15 MB picked, 4 MB stored, 16 MB per request, 12 files, bodySizeLimit 18mb (overnight default, logged on #47)"
  - "send_email binding has no remote flag, so wrangler dev uses the local simulator and needs no credentials"
metrics:
  duration: 35m
  completed: 2026-11-06
estimate:
  tokens: 76000
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
plan_head_before: ff6a41cee7693b8b7cea5b562da1870ad5420974
plan_head_after: b91cb38048a6ad4832a09a33d7630f1539761b6d
---

# Phase 3 Plan 01: Lead bindings spike and photo transport Summary

Email and rate-limit bindings proven on wrangler dev with no credentials, a 16 MB 12-photo server action proven on the Worker runtime, photos sent with the form chosen, and 03-UI-SPEC amended to match.

## Repository setup (Tasks 0a, 0b, done by the orchestrator)

- Task 0a: `git merge-base --is-ancestor 892e742 origin/main` exits 0. PR #43 merged the audit fix. Branch base: origin/main `ff1f10e53a3fd55c669da112b92ebdb10c8c60bd`.
- Task 0b: docs commit on `feat/lead-forms` is `ff6a41cee7693b8b7cea5b562da1870ad5420974` (03-03 branches `feat/saved-cars` from it). Its subject reads `docs(03): phase 3 context, research, UI spec and plans` ("UI spec", not "UI-SPEC" as the plan wrote; cosmetic).

## Spike results (Task 1, wrangler 4.157.0, local mode, no Cloudflare credentials)

| Assumption | Result | Evidence |
|------------|--------|----------|
| A2 `send_email` without `remote` starts under wrangler dev and works locally | PASS | Binding table: `env.EMAIL (unrestricted) Send Email local`. `EMAIL.send({to, from, subject, text})` returned a `messageId`; log: `send_email binding called with MessageBuilder` and the text written to `.wrangler/tmp/email/...` |
| A3 `ratelimits` binding works under wrangler dev | PASS | `env.LEAD_LIMITER (5 requests/60s) Rate Limit local`. Six `limit({key:"spike"})` calls: `[true,true,true,true,true,false]` |
| A4 Managed widget + `appearance: "interaction-only"` has zero height until needed | PASS | Container `offsetHeight`: always-pass key `1x00000000000000000000BB` 0px before and 5 s and 10 s after render (token issued); forced-interactive key `3x00000000000000000000FF` 0px before, 71px after 5 s |
| A5 12 photos (about 16 MB) in one server action on OpenNext, `bodySizeLimit` honoured | PASS | 12 JPEGs of 1,336,250 to 1,337,326 bytes (16.04 MB total) posted in one action, `POST /spike-lead 200 OK (1843ms)`; all 12 put to R2 and read back at identical sizes; no size or memory error in the log. 14 files (about 18.7 MB) also passed. 15 files (about 20 MB) refused: `Error: Body exceeded 18mb limit` with `statusCode: 413`, surfaced to the client as a thrown action (minified React error 441), so the client must catch it and show the send-failure copy |

Caveat on A5: local workerd does not enforce the production 128 MB isolate memory limit. One real 12-photo trade-in on the deployed demo must be checked once the R2 bucket exists (03-13/03-14 verification).

Note for 03-05/03-06: an over-cap body makes Next log an `ERROR` line in wrangler (no payload in it). The CI worker job greps for `ERROR`, so CI must never send an over-cap body.

After cleanup (probe page, probe bucket entry and the `next.config.ts` edit removed, JPEGs deleted): rebuilt, `wrangler dev` answered `/robots.txt` 200, `/` 200, `/spike-lead` 404, and the log had 0 `ERROR` lines. Typecheck 0, lint 0, 249 unit tests pass.

## Photo transport decision (Task 2)

- **Chosen:** `action-formdata` (the recommended option; overnight rule: the owner was asleep, decision logged on #47 with how to undo: https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6698248807).
- **Caps (research defaults, A5 passed, no lowering needed):** `PHOTO_MAX_MB` 15 per picked file, `PHOTO_STORED_MAX_BYTES` 4 MB per stored file, `PHOTO_TOTAL_MAX_BYTES` 16 MB per request, 12 files, `experimental.serverActions.bodySizeLimit: "18mb"`.

## UI-SPEC amendment (Task 3)

Photos table: per-photo states and "Submit while uploading" replaced by a Sending rule and a Total size rule (`PHOTO_TOTAL_MAX_BYTES`); Resizing confirmed (2,000px, JPEG 0.82, strips EXIF and GPS, `PHOTO_MAX_MB` = 15). Copywriting: `Submit while sending` is just `Sending`; upload state strings gone. Motion row "Photo upload progress" deleted. UI Considerations photo error and loading rows rewritten. Open items for email, caps and transport marked resolved. Header now points at 03-RESEARCH.md. Turnstile slot row gains the measured heights. D-15: the find-a-car link replaces the `See all used cars` button.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 9e87b10 | wrangler.jsonc, src/lib/leads/bindings.ts |
| 3 | b91cb38 | 03-UI-SPEC.md |

## Deviations from Plan

None in the code. The Task 2 checkpoint was resolved by the overnight rule (recommended option, logged on #47) rather than an owner reply.

## For the owner (also on #47)

Provision before the real lead path works: Workers Paid, an Email Service sending domain and `LEAD_FROM_EMAIL`, the EU R2 bucket `cartwright-lead-photos`, a Managed Turnstile widget (site key and secret), Neon in Frankfurt (`DATABASE_URL`), and Worker secrets `LEAD_TO_EMAIL` and `PHOTO_LINK_SECRET`.

## Self-Check: PASSED

- FOUND: src/lib/leads/bindings.ts (contains getCloudflareContext, catch, exports getBindings)
- FOUND: wrangler.jsonc has LEAD_LIMITER and send_email; LEAD_PHOTOS count 0
- FOUND: src/app/spike-lead absent; next.config.ts matches origin/main
- FOUND: commits 9e87b10, b91cb38 in HEAD
