---
phase: 02-car-pages-and-discovery
plan: 05
subsystem: car-page
tags: [gallery, lightbox, dialog, scroll-snap]
requires: ["02-03", "02-04"]
provides:
  - "CarGallery: native scroll-snap gallery with counter, arrows and desktop thumbnail strip"
  - "PhotoLightbox: full-viewport native dialog, opens at the tapped photo"
  - "photo-load.ts: settle plus the shared arrow and counter-pill classes"
  - "useSlideIndex: rAF-throttled slide index for a scroll-snap scroller"
affects: [02-07, 02-08]
tech-stack:
  added: []
  patterns: ["showModal() before positioning the dialog scroller (Pitfall 10)", "thumbnail strip scrolled with strip.scrollTo, never the into-view method (Pitfall 9)", "only photos and a name string cross to client components"]
key-files:
  created:
    - src/components/stock/photo-load.ts
    - src/components/car/CarGallery.tsx
    - src/components/car/PhotoLightbox.tsx
    - src/components/car/useSlideIndex.ts
    - src/components/car/CarGallery.test.ts
    - e2e/gallery.spec.ts
  modified:
    - src/components/stock/PhotoCarousel.tsx
    - src/app/used-cars/[slug]/page.tsx
    - src/app/globals.css
key-decisions:
  - "Arrow and counter-pill class strings live in photo-load.ts next to settle, so the card carousel, gallery and lightbox share one copy"
  - "useSlideIndex hook shared by the gallery and lightbox; PhotoCarousel left alone apart from its imports"
  - "PhotoLightbox takes an extra onClose prop so CarGallery can return focus to the slide button explicitly, not only through the platform default"
  - "The Close photos button is first in the dialog so it takes the initial focus even where autofocus is not applied"
requirements-completed: [CAR-01]
status: complete
duration: ~35 min
completed: 2026-11-06
actuals:
  tokens: 28000
  tasks: 2
  commits: 2
plan_head_before: e0c26c3
plan_head_after: 2d07950b3b6721866ff22d9e3230396b0858ba57
---

# Phase 2 Plan 05: Gallery and lightbox Summary

The car page now has a swipeable gallery (counter, hover arrows, desktop thumbnail strip with an aria-current ring) and a full-screen native-dialog lightbox that opens at the tapped photo, moves with the arrow keys, closes with Escape or Close photos and hands focus back to the slide button.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: gallery with counter, arrows, thumbnails | 2cd4468 |
| 2 | Full-screen lightbox in a native dialog | 2d07950 |

Tracer gate: Task 1's verify (vitest, typecheck, lint, production build, gallery, car-page and carousel E2E) was re-run end to end and passed before the lightbox was added.

## Verification (by exit code)

- `npm run lint` exit 0, `npm run typecheck` exit 0, `npx tsc --noEmit` exit 0
- `npm test`: 236 passed (includes the new `CarGallery.test.ts`)
- `APP_ENV=production npm run build` then `APP_ENV=production PORT=3115 npx playwright test`: 93 passed, every spec
- Acceptance greps: `scrollIntoView` count 0 in CarGallery; no `soldAt` in `src/app` or `src/components` outside tests; `addEventListener("load"` count 0 in PhotoCarousel

## Deviations from Plan

**1. [Rule 3 - Blocking] E2E selectors scoped by a test id.** The "Similar cars" cards on the same page carry their own `Photos of ...` carousels, so role queries matched several elements. Added `data-testid="gallery"` to the gallery wrapper and scoped the spec to it.

**2. [Added] `useSlideIndex.ts` and `CarGallery.test.ts`.** Not in the plan's file list. The hook removes a third copy of the rAF index code; the unit test covers the none, one and many photo markup, which the demo data cannot exercise in E2E (no demo car has fewer than 3 photos).

**3. [Added] `onClose` prop on `PhotoLightbox`**, see key-decisions.

**4. Plan section "Verification" steps not performed here** (by instruction of the dispatching agent: never push, no PR, STATE.md and ROADMAP.md untouched). Still open for the orchestrator or owner on the `feat/car-pages` branch:
- ponytail audit (`/ponytail:ponytail-audit`) over plans 02-01 to 02-06
- push and open the #6 PR against `main` (ready for review, `Closes #6`, notes listed in 02-05-PLAN.md verification step 3)
- move #6 to In Review on the board

## Pending: CI worker job for plan 02-03

The expired-car 410 on the Cloudflare Worker cannot be known locally: Windows cannot run the OpenNext build. The result is pending the CI worker job on the PR. If it fails, follow the 02-03 Task 2 fallback before asking for review.

## Human check outstanding

Gesture feel (finger-tracking swipe, lightbox fade, nothing jumping, page not moving under the lightbox) on a Pixel 7 or Chrome device mode against the production build. Playwright covers behaviour, not feel.

## Follow-up from 02-04 (not fixed here, out of scope)

About 6 demo cars have a comma-separated equipment line as their `description`: 4396311, 4520171, 4381995, 4474493, 4401031, 4390543. The better fix is in the demo-stock parser (`scripts/stock/demo-stock.mjs`): move that line into `features` and regenerate `demo-cars.json`. This plan touches no stock data or parser files.

## Known Stubs

None.

## Threat Flags

None. T-02-18 holds: `CarGallery` and `PhotoLightbox` receive only `photos` and a name string.

## Self-Check: PASSED

Created files exist (`CarGallery.tsx`, `PhotoLightbox.tsx`, `photo-load.ts`, `useSlideIndex.ts`, `CarGallery.test.ts`, `gallery.spec.ts`); both task commits are ancestors of HEAD.
