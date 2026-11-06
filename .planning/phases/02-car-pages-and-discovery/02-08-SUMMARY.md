---
phase: 02-car-pages-and-discovery
plan: 08
subsystem: car-page
tags: [share, whatsapp, og-image, satori, sharp, metadata]
requires: ["02-05"]
provides:
  - "ShareButton: WhatsApp link before JS, native share sheet or Share on WhatsApp / Copy link menu once hydrated"
  - "scripts/stock/og.mjs and npm run stock:og: one 1200x630 progressive JPEG per car in public/og/"
  - "carMetadata: og:image (absolute via metadataBase), width, height, alt, twitter summary_large_image"
affects: []
tech-stack:
  added: []
  patterns: ["useSyncExternalStore mode switch (server link, client native or menu), as BackToCars", "next's bundled satori and resvg imported from next/dist/compiled/@vercel/og/index.node.js, sharp composites"]
key-files:
  created:
    - src/components/car/ShareButton.tsx
    - scripts/stock/og.mjs
    - scripts/stock/fonts/Inter-SemiBold.ttf
    - scripts/stock/fonts/LICENSE.txt
    - public/og/ (57 images)
    - e2e/share.spec.ts
  modified:
    - src/components/car/BuyBox.tsx
    - src/components/stock/icons.tsx
    - src/lib/stock/seo.ts
    - src/lib/stock/seo.test.ts
    - src/lib/stock/demo-cars.test.ts
    - public/_headers
    - package.json
    - README.md
key-decisions:
  - "Button label is Share (UI-SPEC Share section), not Share car from the copy table"
  - "No new package: the OG script uses next's internal compiled @vercel/og path (Assumption A1) and the existing sharp devDependency; package-lock.json is unchanged"
  - "Sold cars share and preview with the word Sold only: no price, no sale date in share text, OG image or metadata"
  - "Menu close is instant (unmount); only the open animates (150ms opacity plus 4px move, opacity only under reduced motion)"
requirements-completed: [CAR-04, CAR-05]
status: complete
duration: ~40 min
completed: 2026-11-06
actuals:
  tokens: 7000
  tasks: 3
  commits: 3
plan_head_before: 24686c6
plan_head_after: 7d5aa54
---

# Phase 2 Plan 08: Share and preview Summary

A buyer can share any car in one tap (native sheet, or WhatsApp and Copy link menu, or a plain WhatsApp link with no JavaScript), and every car page now previews with its own pre-generated photo, name and price image.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: ShareButton in the BuyBox price row, with E2E | 011c1e4 |
| 2 | OG generator, Inter SemiBold font, 57 images | b3d2733 |
| 3 | carMetadata image and twitter fields, `/og/*` noindex, tests | 7d5aa54 |

Tracer gate: Task 1's verify (typecheck, lint, production build, share and car-page E2E, 20 passed) was re-run end to end before the OG work began.

## Verification (by exit code)

- `npm run lint` exit 0, `npx tsc --noEmit` exit 0
- `npm test`: 238 passed
- `APP_ENV=production npm run build` exit 0, then `APP_ENV=production PORT=3117 npx playwright test`: 103 passed (every spec)
- `npm run stock:og` run twice: `sha1sum public/og/*` identical both times; 57 images, largest 148 KB (4578723.jpg), total 5.86 MB
- One for-sale image (4359693) and one sold image (4359735) opened and checked against the UI-SPEC layout: photo top 462px, ink band, name, price largest, logo right; sold shows overlay, Sold pill top left, name centred in the band, no price
- Acceptance greps: no `location.href`, `console.` or `soldAt` in `src/app` or `src/components` outside tests; no em dash in src outside tests; no `stock:og` in `.github`; `build` script and `package-lock.json` unchanged (no dependency added)

## Font (owner decision 3)

- Source: official release `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` (Inter v4.1), extracted in the session scratchpad, only two files copied, nothing from the zip executed
- `scripts/stock/fonts/Inter-SemiBold.ttf` SHA-256 `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3`
- `scripts/stock/fonts/LICENSE.txt` (SIL Open Font License 1.1) SHA-256 `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`

## Note for Next upgrades

`scripts/stock/og.mjs` imports `next/dist/compiled/@vercel/og/index.node.js`, an internal path (Assumption A1). Re-run `npm run stock:og` after every Next upgrade; if the path moves, switch to `satori` plus `@resvg/resvg-js` as devDependencies (needs a package legitimacy check).

## Deviations from Plan

**1. [Added] Test and spec details beyond the list.** `e2e/share.spec.ts` also covers a native-share failure other than AbortError falling back to the menu, and the copy menu closing and returning focus after 2 seconds. No new files beyond the plan.

**2. Plan "Verification" section not performed** (by instruction of the dispatching agent: never push, no PR, STATE.md and ROADMAP.md untouched). Still open for the orchestrator or owner:
- `git fetch`, rebase `feat/share-preview` (here: this worktree branch) onto `origin/main` once the #6 PR has merged
- ponytail audit (`/ponytail:ponytail-audit`) over the changes against `main`
- push and open the #7 PR against `main` (ready for review, `Closes #7`, with the audit findings, E2E result, font source and licence, the `Share` label choice, and the preview test note: Cloudflare Access blocks the preview bots on the demo, the owner picks how to test)
- move #7 to In Review on the board

## Human check (owner, end of phase)

Share a car link and a sold car link in WhatsApp, iMessage and Facebook (Sharing Debugger) from a host the preview bots can reach. The demo is behind Cloudflare Access, which blocks those bots. Expected: photo with the name and price band (sold: overlay, Sold pill, no price, no date), nothing cropped inside the 48px safe zone.

## Known limits

- `shortcut:` comments in `seo.ts` and `og.mjs`: images are demo-only and pre-generated (a live provider needs the first photo or a request-time image, #16); files are named `{id}.jpg`, so a platform that cached a link may show an old image after regeneration.
- Landing pages get no OG image (the planner's option in the UI-SPEC).

## Known Stubs

None.

## Threat Flags

None. T-02-24 to T-02-27 and T-02-SC are mitigated as planned (text built from server fields and `SITE_URL`, `rel="noopener noreferrer"` on both WhatsApp links, share and clipboard rejections handled and E2E-stubbed, `/og/*` noindex, no date drawn or shared, no package installed).

## Self-Check: PASSED

Files exist (ShareButton.tsx, og.mjs, fonts, public/og 57 files, share.spec.ts); commits 011c1e4, b3d2733, 7d5aa54 are ancestors of HEAD.
