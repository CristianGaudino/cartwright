---
phase: 03-leads-finance-and-saved-cars
plan: 13
subsystem: leads
status: complete
tags: [r2, photos, signed-url, server, tracer]
requires:
  - "03-01: PhotoBucket, getBindings, action-formdata decision and caps"
  - "03-11: trade_in schema branch and /sell-your-car"
provides:
  - "LEAD_PHOTOS r2_buckets binding (EU) in wrangler.jsonc; 18mb server action body cap"
  - "Photo caps and copy in src/lib/leads/constants.ts (client-safe)"
  - "src/lib/leads/photos.ts: sniffImage, signPhotoPath, verifyPhotoSig"
  - "Photo step in processLead with cleanup; Deps.bucket and Deps.photoLinkSecret"
  - "GET /lead-photos/[...key]: signed, expiring, uncached read"
  - "Signed Photo n links in the dealer email"
affects: [03-14]
tech-stack:
  added: []
  patterns: ["photos checked with the fields, before Turnstile", "put photos, then insert, delete this request's keys on any failure or a lost insert race"]
key-files:
  created: [src/lib/leads/photos.ts, src/lib/leads/photos.test.ts, "src/app/lead-photos/[...key]/route.ts"]
  modified: [wrangler.jsonc, next.config.ts, src/lib/leads/constants.ts, src/lib/leads/process.ts, src/lib/leads/deps.ts, src/lib/leads/email.ts, src/lib/leads/email.test.ts, src/lib/leads/process.int.test.ts, src/lib/leads/process.test.ts, src/lib/leads/no-logging.test.ts, eslint.config.mjs, .env.example]
decisions:
  - "Photo caps live in constants.ts, not schema.ts, so the picker can import them without zod"
  - "No bucket, lifecycle rule or PHOTO_LINK_SECRET created: provisioning (03-02) is not done; proven on wrangler dev's local R2; A6 untested, logged on #47"
  - "The E2E fake bucket drops photos (no-op put and delete), like the fake mailer, so the E2E server keeps no personal data"
metrics:
  duration: 25m
  completed: 2026-11-08
estimate:
  tokens: 65000
actuals:
  tokens: 7300
  tasks: 3
  commits: 1
plan_head_before: 8c73a66857972f6d655081431742e4cab8e36f28
plan_head_after: 1d1f11a6bee468ed609559a7e45a5f1ca455d378
---

# Phase 3 Plan 13: Trade-in photos on the server Summary

A trade-in's photos are checked by their bytes and the caps, stored under `trade-in/{leadId}/` in a private EU R2 bucket, kept in the row as keys, and linked from the dealer email through HMAC-signed links that expire after 7 days. A failed write, a failed insert or a lost double-submit race leaves no orphan photo.

## What was built

- **Config:** `wrangler.jsonc` binds `LEAD_PHOTOS` to `cartwright-lead-photos` with `"jurisdiction": "eu"`. `next.config.ts` sets `experimental.serverActions.bodySizeLimit: "18mb"` (Next 16.4.5 docs: under `experimental`; applies to every action).
- **Caps** (03-01 values) in `constants.ts`: `PHOTO_MAX_COUNT` 12, `PHOTO_MAX_MB` 15, `PHOTO_STORED_MAX_BYTES` 4 MB, `PHOTO_TOTAL_MAX_BYTES` 16 MB, `PHOTO_TYPES`, and the three messages. They are in constants.ts rather than schema.ts so client code never pulls in zod.
- **photos.ts:** `sniffImage` reads magic bytes only (JPEG, PNG, WebP) and returns the extension and content type. `signPhotoPath` signs `{key}.{exp}` with HMAC-SHA256 and returns a base64url signature, valid 7 days by default. `verifyPhotoSig` rejects a malformed or past `exp` and a signature that is not 43 base64url characters, then calls `crypto.subtle.verify` (constant time).
- **processLead:** for `trade_in` only, the photos are checked with the fields and before Turnstile, so a bad photo never spends the token. The order is count, then total, then each file's bytes and size. A failure gives `invalid` with a `photos` error, merged with any field errors. After the duplicate check, each photo is put at `trade-in/{row.id}/{n}.{ext}` with the sniffed content type, then the row is inserted. A put or insert that throws deletes the keys (best effort) and returns `failed/server`, logged as `error`. An insert that returns false deletes this request's keys and returns ok with no mail. Signed paths are made only when there are keys, inside the mail try, so a missing secret becomes `notify_failed` with the row kept.
- **Route:** `/lead-photos/[...key]` refuses with 403 before reading the bucket unless the key starts with `trade-in/`, has no `..`, and carries a valid `exp`/`sig`. It answers 404 when the object is missing and streams with the stored content type, `private, no-store`, `noindex` and `nosniff`. It logs nothing and is covered by the `no-console` lint block.
- **Email:** `Photo {n}: {SITE_URL}{signed path}` lines after the car page line.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 8 files, 93 tests (photos, email, int and no-logging cases added) |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY=... npm run build` | exit 0 |
| `PORT=3187 npx playwright test e2e/trade-in.spec.ts e2e/sourcing.spec.ts e2e/leads.spec.ts` | 18 passed |
| Worker on `wrangler dev` (OpenNext build, local R2, a local-only secret in a temporary `.dev.vars`) | `env.LEAD_PHOTOS (cartwright-lead-photos (eu)) R2 Bucket local`. Signed link 200 with `image/jpeg`, `private, no-store`, `noindex`, `nosniff`. Wrong secret, expired, unsigned and other-prefix links 403. Missing object 404. 0 `ERROR` lines |

Integration cases (PGlite with a fake bucket): one JPEG stored under `trade-in/{id}/1.jpg` with the key in `photo_keys` and null car fields; two photos with the type taken from the bytes (a PNG named .jpg is stored as .png); a GIF named .jpg, a 13th file, a file over 4 MB and a set over 16 MB each refused with nothing written; a photo on an enquiry ignored; a put that throws leaves no row and no objects; an insert that throws deletes every put; insert returning false (with `exists` stubbed false over a stored row with the same ref) gives ok, no second mail, one row with its photo keys unchanged, and a bucket holding exactly the first row's keys.

## A6: lifecycle rule on the EU bucket

**Not tested.** No real bucket exists (03-02 provisioning not done, and no Cloudflare login was used in this run). wrangler 4.157's `r2 bucket lifecycle add` accepts `--jurisdiction`, so the CLI supports it. 03-14's runbook gives the setup commands, a `lifecycle list` check, and a monthly manual cleanup if the rule cannot be set.

## Deviations from Plan

**1. [Rule 3 - Blocked infra] No bucket, lifecycle rule or Worker secret created.** The acceptance checks `wrangler r2 bucket list` and `wrangler secret list` were not run. Per the run instructions, provisioning is not done and secrets are never invented, so the local miniflare R2 stood in. Logged on #47 with the setup commands.

**2. [Discretion] Caps in `constants.ts`, not `schema.ts`.** As instructed: client components import constants.ts only.

**3. [Discretion] E2E fake bucket is a no-op**, not an in-memory map, matching the fake mailer's "no personal data" rule. The integration test has its own in-memory bucket.

**4. [Process] TDD order.** The tests for Tasks 2 and 3 were written with the code in one pass, not red first. Every behaviour in the plan has a case, and the cleanup assertions fail if a `cleanup()` call is removed.

## Known Stubs

None.

## Threat Flags

None beyond the register. T-03-30 (sniff, caps, nosniff), T-03-31 (18mb cap, 16 MB total, 12 files), T-03-32 (random UUID prefix, HMAC, 7 days, prefix check, constant-time verify, no-store, noindex, 403 first), T-03-34 (no public access configured by this code; bucket settings are owner provisioning) and T-03-35 (cleanup on put failure, insert failure and a lost race; lifecycle rule or runbook fallback) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1-3 | 1d1f11a | wrangler.jsonc, next.config.ts, constants, photos (+test), process, deps, email (+test), int/unit/no-logging tests, route, eslint, .env.example |

## Self-Check: PASSED

- FOUND: src/lib/leads/photos.ts (sniffImage, signPhotoPath, verifyPhotoSig, `crypto.subtle.verify`, `HMAC`)
- FOUND: src/app/lead-photos/[...key]/route.ts (`no-store`, `noindex`, `nosniff`, `trade-in/`)
- FOUND: wrangler.jsonc `LEAD_PHOTOS`, `"jurisdiction": "eu"`; next.config.ts `18mb`; eslint `src/app/lead-photos/**`; .env.example `PHOTO_LINK_SECRET=`
- FOUND: commit 1d1f11a in HEAD
