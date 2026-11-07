---
phase: 03-leads-finance-and-saved-cars
plan: 14
subsystem: leads
status: complete
tags: [photos, picker, exif, retention, pr, tracer]
requires:
  - "03-13: photo caps, server checks, LEAD_PHOTOS, signed /lead-photos links"
provides:
  - "PhotoPicker (Add photos tile, previews, remove, limits, live region) after Year on /sell-your-car"
  - "downscale: on-device 2,000px JPEG re-encode that drops EXIF and GPS"
  - "PlusIcon"
  - "LeadForm photo state, PhotoBinding, total backstop, send waits while photos shrink"
  - "Runbook: bucket setup, lifecycle rule, monthly fallback, photo erasure, late access, What deletes what"
  - "/privacy mentions photos; CI worker case /lead-photos/trade-in/x 403; route unit test"
  - "The #12 pull request"
affects: [03-15, 03-16, "#20 admin inbox (fresh photo links)"]
tech-stack:
  added: []
  patterns: ["photos kept as shrunk Blobs in LeadForm state; the file input only adds", "blob previews set on the img element in an effect, revoked on unmount"]
key-files:
  created: [src/components/leads/PhotoPicker.tsx, src/components/leads/downscale.ts, "src/app/lead-photos/[...key]/route.test.ts"]
  modified: [src/components/leads/LeadForm.tsx, src/components/leads/LeadPageForm.tsx, src/components/leads/TradeInFields.tsx, src/components/stock/icons.tsx, src/app/privacy/page.tsx, docs/lead-retention.md, .github/workflows/ci.yml, e2e/trade-in.spec.ts, e2e/leads.spec.ts, src/lib/leads/process.ts, src/lib/leads/deps.ts]
decisions:
  - "Photos group rendered by PhotoPicker inside TradeInFields, not in sell-your-car/page.tsx: the photo state lives in LeadForm and a server page cannot pass the field render function (logged on #47)"
  - "Send button disabled while picked photos are being shrunk, so a quick tap never sends without them (audit finding, logged on #47)"
  - "PR opened while #49 (#11) is open, carrying its commits, per the run instructions"
metrics:
  duration: 40m
  completed: 2026-11-08
estimate:
  tokens: 70000
actuals:
  tokens: 8700
  tasks: 3
  commits: 2
plan_head_before: 1d1f11a6bee468ed609559a7e45a5f1ca455d378
plan_head_after: aa9f613d2ab97c42a09bcda9e7b267b3aaa9edbe
---

# Phase 3 Plan 14: Trade-in photo picker, runbook and the #12 PR Summary

Sellers add up to 12 photos on /sell-your-car. Each is shrunk on the phone to a 2,000px JPEG with no location data, previewed at once, removable, and kept under the 4 MB per-file and 16 MB total caps. The photos go with the lead, and a size refusal keeps every photo and field. The runbook covers photo retention, erasure and late access, and the #12 PR is open.

## What was built

- **downscale.ts:** `createImageBitmap(file, { imageOrientation: "from-image" })` draws onto a white canvas, then `toBlob("image/jpeg", 0.82)` at a 2,000px long edge.
- **PhotoPicker:** a fieldset with the legend `Photos (optional)` and the helper `Up to 12 photos. JPEG, PNG or WebP, 15 MB each.` (from the constants). A grid of 3 columns (4 from 640px) with 8px gaps and 4:3 tiles, `object-cover` on `#26262B`. Remove is a 28px scrim-60 circle inside a 44px target, solid ink under reduced transparency, `aria-label="Remove photo {i}"`. The Add photos tile is a `<label>` for an `sr-only` native input (focus ring through `peer-focus-visible`), with a dashed control border, 12px radius and `PlusIcon`. It is last and disappears at 12. Checks per pick:
  - type and 15 MB on the original
  - a failed re-encode, or a result over 4 MB, gets the per-file message
  - files past 12 get `You can add up to 12 photos.`
  - a photo that would push the total past 16 MB gets the total message, and the rest are kept

  A polite live region announces `{n} photos added. {n} of 12 photos.` and `Photo removed`, and lists the refusals (filenames wrap with `break-words`). Previews are blob URLs set on the `<img>` in an effect and revoked when the tile or page goes.
- **LeadForm:** holds `photos: Blob[]` and passes a `PhotoBinding` to the field render function. On submit it drops the file input's entry, appends each photo as `photos` / `photo-{n}.jpg`, and clears them after success. A total over 16 MB is a backstop error in the summary and nothing is sent. A thrown call (Next's 413) shows the send-failure alert with the photos still in state. The submit is disabled while photos are shrinking.
- **TradeInFields:** `PhotoPicker` after Year. **LeadPageForm** spreads the form binding into the field set.
- **Runbook (`docs/lead-retention.md`):** a Trade-in photos section covering one-time setup (bucket create, lifecycle rule `trade-in/` 365 days, `lifecycle list`, secret generated and piped without printing), the monthly cleanup if the rule is missing, erasing one person's photos (`r2 object delete ... --jurisdiction eu --remote`), and opening a photo after its 7-day link expires (`SELECT photo_keys` then `r2 object get ... --file photo.jpg`, until #20). Then "What deletes what". The erasure section now says to delete photos first.
- **/privacy:** photos are shrunk on the phone, location and camera details removed, and kept for the same `{LEAD_RETENTION_MONTHS}` months. Cloudflare keeps them in the EU.
- **CI:** worker case `"/lead-photos/trade-in/x 403"`.

## Verification

| Check | Result |
|-------|--------|
| `npm run lint; echo $?` | 0 |
| `npx tsc --noEmit`, `npm run typecheck` | exit 0 |
| `npm test` | exit 0, 19 files, 349 tests |
| `APP_ENV=production NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB npm run build` | exit 0 |
| `APP_ENV=production PORT=3187 npm run e2e` (full suite, production build) | **143 passed**, exit 0 |
| Runbook greps (`r2 object get`, `photo_keys`, `365`, `/lead-photos/trade-in/x 403` in ci.yml) | all present |
| Screenshot of the picker at Pixel 7 width | 3-column grid, scrim Remove circles, dashed Add tile, wrapped GIF refusal |

New E2E (`e2e/trade-in.spec.ts`): a photo shrunk, previewed and sent ends on the thanks (the server sniffs the real canvas JPEG). Remove announces and empties the grid. 13 photos keep 12 with no Add tile. A GIF is refused by name and the batch kept. With `toBlob` returning 3 MB, 6 picks keep 5 with the total message. With 5 MB, the per-file message shows and no tile is added. A 413 on the POST shows `We could not send this.` and `Your details are still here.` with the tiles and reg kept. The grid fits 320px with a 120-character filename. The send button is disabled while shrinking. `e2e/leads.spec.ts`'s privacy check now matches the full retention sentence, because "12 months" appears twice.

## Pre-PR gate

1. **#11:** PR #49 (feat/lead-forms) is still open. Per the run instructions the #12 PR is opened anyway against main, and its body says it carries #49's commits until #49 merges. No rebase on main.
2. **Ponytail audit** of origin/feat/lead-forms...HEAD (03-11 to 03-14) plus callers and tests:
   - **Must fix 1, fixed:** a photo removed while others were shrinking came back (stale snapshot). Now a functional update.
   - **Must fix 2, fixed:** tapping send while photos were shrinking sent the lead without them. The submit now waits.
   - **Must fix 3, owner:** the bucket must exist before merge or the deploy fails. Stated in the PR body and on #47.
   - **Should fix 4, fixed:** route unit test (403 before any bucket read for 5 bad links, 404, headers).
   - **Should fix 5, fixed:** `Deps.bucket` narrowed to put and delete.
   - **Nice to have 6, left:** sequential photo puts, about 1 s for 12. Parallel puts make cleanup harder, so measure on the demo first.
3. Checks as in the table above, all by exit code.
4. PR opened ready for review, `Closes #12`, added to project 6 and moved to In Review.

## Deviations from Plan

**1. [Rule 3 - Blocking] Photos group in PhotoPicker/TradeInFields, not sell-your-car/page.tsx.** The acceptance grep `Photos (optional)` / `PHOTO_MAX_MB` in page.tsx does not match. They are in PhotoPicker.tsx, for the same server/client reason as 03-11. Logged on #47.

**2. [Rule 1 - Bug, audit] Send disabled while photos shrink, and a functional photo update.** Both were found by the audit and are covered by an E2E test (the button). Logged on #47.

**3. [Rule 1 - Bug] e2e/leads.spec.ts privacy assertion** made specific, because the new photo sentence repeats "12 months".

**4. [Run instruction] PR opened before #49 merged.**

## Human check pending

On a real iPhone (Safari, HEIC originals) and a mid-range Android (Chrome), on the deployed demo after #12 merges and the bucket exists: add 12 photos, remove one, send. Expect every preview to show, HEIC to arrive as JPEG, the send to finish on mobile data, 11 Photo links in the dealer email that open, and no photo to open without its link (research A7, A8, and the A5 production memory caveat).

## Known Stubs

None.

## Threat Flags

None beyond the register. T-03-33 (re-encode strips EXIF and GPS, originals never kept or sent), T-03-47 (picker total check, LeadForm backstop, 413 keeps work, server re-checks) and T-03-48 (runbook late access) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1-3 | 6e6c3a6 | PhotoPicker, downscale, LeadForm, LeadPageForm, TradeInFields, icons, privacy, runbook, ci.yml, trade-in and leads specs |
| audit | aa9f613 | PhotoPicker, LeadForm, route test, Deps.bucket narrowing, trade-in spec |

## Self-Check: PASSED

- FOUND: downscale.ts (`imageOrientation`, `image/jpeg`); LeadForm.tsx (`append("photos"`, `PHOTO_TOTAL_MAX_BYTES`); PhotoPicker.tsx (`PHOTO_STORED_MAX_BYTES`, `PHOTO_TOTAL_MAX_BYTES`, `Remove photo`, `aria-live`; the count message through `PHOTO_COUNT_ERROR` in constants.ts); icons.tsx `PlusIcon`
- FOUND: docs/lead-retention.md (`trade-in/`, `365`, `7 days`, `r2 object get`, `r2 object delete`, `LEAD_RETENTION_MONTHS`, `What deletes what`); privacy mentions photos and location; ci.yml `/lead-photos/trade-in/x 403`
- FOUND: e2e/trade-in.spec.ts `toBlob` override and 413 route tests
- FOUND: commits 6e6c3a6, aa9f613 in HEAD
