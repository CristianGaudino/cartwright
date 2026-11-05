---
phase: 01-design-and-stock-browsing
plan: 03
subsystem: demo-data
tags: [demo-data, scraper, sharp, photos]

requires:
  - phase: 01-01
    provides: "createFileProvider and the Car types"
provides:
  - "scripts/stock/demo-stock.mjs: polite one-run fetch into .stock-cache/ and an offline deterministic build"
  - "src/lib/stock/demo-cars.json: 57 real dealer cars, each with 3 to 6 photos"
  - "public/stock/: 342 WebP photos at 900 x 675 q72, content-hashed (20.4 MB)"
  - "src/lib/stock/index.ts: the single config point exporting stock (D-06)"
  - "public/_headers: immutable cache and noindex for /stock/*"
affects: [01-04, 01-05, 01-06, 01-07]

actuals:
  tokens: 60000
  tasks: 3
  commits: 2
plan_head_before: 93efb4e48a20485ecc6725d5e3bc5ca38d8f7f3f
plan_head_after: 54dbbe5f7620e43c72f50375715b56307d487585

tech-stack:
  added: [sharp (devDependency)]
  patterns: ["fetch/build split: network once into a self-ignoring cache, offline deterministic build"]

key-files:
  created:
    - scripts/stock/demo-stock.mjs
    - src/lib/stock/index.ts
    - src/lib/stock/demo-cars.json
    - src/lib/stock/demo-cars.test.ts
    - public/stock/
    - public/_headers
  modified:
    - package.json
    - package-lock.json
    - README.md

key-decisions:
  - "Photos 900 x 675 WebP q72, up to 6 per car, not 1200 x 900 (D-11): sources are 938 x 704, so 1200 x 900 would be an upscale"
  - "Owner accepted the full set at 20.4 MB (the trial had projected 15.5 MB; full-set photos average 58.3 KB against 43.5 KB in the trial)"
  - "Specs come from the listing JSON; detail pages are fetched only for the photo gallery"

requirements-completed: [STK-02]

duration: 60min
completed: 2026-11-05
status: complete
---

# Phase 1 Plan 03: Demo stock from the dealer's listings Summary

**57 real cartwright.ie cars with 342 re-encoded photos, built offline and deterministically from a cache fetched once, and served through the single `stock` config point.**

## Accomplishments
- `fetch` reads the stock page, the theme `main.js`, makes one listing POST (body mirrors the site's own unfiltered search, page size raised to 100), then one detail page per car for its gallery and the photos from the CDN. Hosts are whitelisted, requests are 1.5 s apart (0.3 s for photos), never retried, and every request is logged.
- `build` is offline: cleans text (no tags, entities or en/em dashes), maps fuel and gearbox to the closed sets, writes `demo-cars.json` and the photos. Two runs gave identical bytes.
- `demo-cars.test.ts` checks the data and files; `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` all exit 0.

## Reports
**Trial (3 cars):** carsBuilt 3, photos 18, 802,334 bytes, avgPhotoKB 43.5, projectedMB 15.5, unmappedFuel none.

**Final:** listTotal 58, carsBuilt 57, photos 342, bytes 20,409,362 (20.4 MB), avgPhotoKB 58.3, projectedMB 20.8, unmappedFuel none.

**Skipped:** 4597425, only 1 usable photo (STK-02 needs at least 3). The listing returned 58 cars, which matches `data.count`; the stock page shows both 57 and 58.

**Request totals (whole log):**

| Run | www.cartwright.ie | Of which | c0.carsie.ie |
| --- | ----------------- | -------- | ------------ |
| Trial | 6 | page 1, main.js 1, listing POST 1, car-details 3 | 18 |
| Full | 61 | page 1, main.js 1, listing POST 1, car-details 58 | 343 |

The listing POST was sent once, ever.

## Owner's checkpoint answers
Trial approved ("Approved") for size, quality and format, and for the full fetch with the counts above. After the full build projected 20.8 MB, the owner chose "Accept" over reducing quality or photos per car. Both answers reached me through the coordinator, not directly.

## Deviations from Plan

**1. [Rule 1 - Process] Full fetch ran on a relayed approval.** I ran the full `stock:fetch` after the coordinator relayed the owner's "approved", before the owner's reply was confirmed to me directly. The run stayed within the approved request counts and the owner later confirmed. Nothing was committed until the owner accepted the final size.

**2. Detail pages are for photos, not specs.** The plan assumed the listing might lack specs. It carries every spec but only the main photo URL, so `build` reads specs from the listing and the detail page is read only for the gallery (the plan's skip rule names photo URLs). `variant` is filled from the listing's "highlights" text with the make and model removed.

**3. Photo size above the trial projection.** 20.4 MB against 15.5 MB projected. Still under the 30 MB budget and accepted by the owner.

## Known Stubs
None.

## Threat Flags
None. The photos on the public domain carry `X-Robots-Tag: noindex` through `public/_headers`.

## Deploy note for the owner
No workflow deploys on merge. `ci.yml` runs on pull requests only, `deploy.yml` runs only when called or dispatched, and `release.yml` is run by hand. Merging #3 publishes nothing. The dealer's photos in `public/stock/` go public at the next release tag after the merge. The `.claude/CLAUDE.md` release-tag rule is authoritative. The owner decides whether a release may go out while the demo data is in.

`.planning/REQUIREMENTS.md` FND-01 ("deployed on merge to `main`"), its "Every merge to `main` deploys for now" row, and the ROADMAP overview's "deploy on merge" are stale and need the owner's correction. This plan did not edit them.

## Still to do (outside this plan)
Pre-PR gate for #3 (ponytail audit, E2E against a production build), open the PR with `Closes #3`, and move #3 to In Review. The E2E was not run here.

## Self-Check: PASSED
Files exist (`scripts/stock/demo-stock.mjs`, `src/lib/stock/index.ts`, `demo-cars.json`, `demo-cars.test.ts`, `public/stock/`, `public/_headers`); commits cfd0ed9 and 54dbbe5 are on `feat/phase-1-stock-browsing`; `.stock-cache` is untracked and ignored.
