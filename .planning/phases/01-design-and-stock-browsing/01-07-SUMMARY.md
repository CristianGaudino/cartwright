---
phase: 01-design-and-stock-browsing
plan: 07
subsystem: stock-page
tags: [carousel, scroll-snap, lazy-loading, cls]

requires:
  - phase: 01-05
    provides: "ListingCard, icons.tsx, e2e/stock.spec.ts, production-build E2E setup"
provides:
  - "src/components/stock/PhotoCarousel.tsx: scroll-snap carousel with lazy images, dots, pointer-only arrows, 150ms fade, failure state"
  - "ListingCard renders PhotoCarousel in the reserved 4:3 box"
  - "e2e/carousel.spec.ts and src/components/stock/PhotoCarousel.test.ts"
affects: [01-08, 01-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 04299d9b18a233f9f81ed07207f09943dbc59fe4
plan_head_after: 98f7f3f66868f39e6e8ead1e2cb7a9a4a34ab572

tech-stack:
  added: []
  patterns: ["stable ref callback with load/error listeners instead of next/image onLoad/onError props", "data-js on the root so hide-until-loaded CSS only applies when JavaScript runs"]

key-files:
  created:
    - src/components/stock/PhotoCarousel.tsx
    - src/components/stock/PhotoCarousel.test.ts
    - e2e/carousel.spec.ts
  modified:
    - src/components/stock/ListingCard.tsx

key-decisions:
  - "Load and error are caught by listeners added in a module-level ref callback, not by onLoad/onError props: next/image re-sets img.src after hydration whenever onError is passed, which re-requests every photo"
  - "The carousel root is z-10 so it sits above the card's stretched title link (after:absolute after:inset-0), which otherwise swallows swipes"

requirements-completed: [BRW-05]

duration: 25min
completed: 2026-11-06
status: complete
---

# Phase 1 Plan 07: Photo carousel Summary

**Every listing card now swipes through up to 6 photos with native scroll-snap (no library, no gesture code); only the first photo of the first two cards is eager, the rest are lazy, the 4:3 box is reserved so CLS stays under 0.05, and pointer devices get hover arrows while touch devices get none.**

## Accomplishments
- `PhotoCarousel` (client component): `role=group` / `aria-roledescription=carousel` scroller with `snap-x snap-mandatory overscroll-x-contain`, hidden scrollbar, `motion-safe:scroll-smooth`; slides labelled "Photo i of n"; each slide's image sits in a `tabIndex=-1`, `aria-hidden` link to the car page, so a tap opens the car and a swipe never does.
- Loading: `width=900 height=675`, no `sizes`, slide 1 of a `priority` card is `eager` + `fetchpriority=high`, everything else lazy.
- Dots (2+ photos): decorative, `data-dot` / `data-active`, index from `Math.round(scrollLeft / clientWidth)` on `requestAnimationFrame`.
- Arrows (2+ photos): "Previous photo" / "Next photo", 44px, only under `@media (hover:hover)`, transparent until card hover or focus-within, not rendered at the first/last photo, solid under `reduce-transparency:`.
- Fade: images hide at opacity 0 only inside a `data-js` root, 150ms transition to visible on `data-loaded`; a failed image gets `data-failed` (`visibility:hidden`) so the grey box shows with no broken icon.
- Zero photos: "No photo yet" panel at the same size. One photo: no dots, no arrows.

## Task Commits
1. Task 1 (tracer): `029b3ca` feat(01-07): swipeable photo carousel on every listing card
2. Task 2: `98f7f3f` feat(01-07): carousel dots, pointer-only arrows, photo fade and failure state

## Verification (by exit code)
- `npm run typecheck`: 0. `npm run lint`: 0. `npm test`: 0 (114 tests, 4 new). `npm run build`: 0.
- `npm run e2e` on the production build: 20 passed (smoke 2, stock 10, carousel 8). `stock-filters.spec.ts` does not exist yet (01-06 is not run).
- Tracer gate: after Task 1 the verify (typecheck, lint, build, carousel + stock specs, 15 tests) passed end to end before Task 2 started.
- Greps: no `sizes=` in `PhotoCarousel.tsx`, no em dash, `ListingCard.tsx` has no `"use client"`, `package.json` unchanged.

## Not verified
- The Task 2 human check (swiping and flicking on a real phone, reversing mid-gesture, arrows and Tab on a laptop, Slow 4G fade) is not done. Automated checks cover loading attributes, the last-photo request, CLS, dots, arrows, blocked images and tap-to-open.
- The pre-PR gate from CLAUDE.md (ponytail audit, PR, project board move) is not run: this plan was executed on `feat/phase-1-stock-browsing` as instructed, not on `feat/listing-carousel`, and no PR was opened.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Carousel was under the card's stretched title link**
- **Found during:** Task 1 design check (before first run)
- **Issue:** `ListingCard` makes the whole card clickable with `after:absolute after:inset-0` on the title link. That pseudo-element comes later in the DOM than the photo, so it covers the carousel and a swipe would start on the link, not the scroller.
- **Fix:** carousel root is `relative z-10`. A new E2E test (tap on a photo opens the car) guards it.
- **Files modified:** `src/components/stock/PhotoCarousel.tsx`, `e2e/carousel.spec.ts`
- **Commit:** 029b3ca, 98f7f3f

**2. [Rule 1 - Bug] `onError` prop makes next/image re-request every photo**
- **Found during:** Task 2 (E2E showed `src` rewritten to an absolute URL after hydration)
- **Issue:** `next/image` runs `img.src = img.src` after hydration whenever `onError` is passed, which retries the whole request for each photo. The plan specified `onLoad` and `onError`.
- **Fix:** a stable module-level ref callback adds one-shot `load` and `error` listeners, and still checks `complete` / `naturalWidth` for images settled before hydration. Same behaviour, no re-request.
- **Files modified:** `src/components/stock/PhotoCarousel.tsx`
- **Commit:** 98f7f3f

**3. [Rule 2 - Missing] Added tap-to-open E2E test and `<Link>` for the photo anchor**
- The plan listed no test for "a tap on a photo opens the car page"; added. The photo anchor is `next/link` (renders an `<a>`, keeps soft navigation, matches the old card), not a raw `<a>`.

## Known Stubs
None.

## Threat Flags
None. T-01-23 (local `/stock/` srcs only, E2E-asserted), T-01-24 (lazy, asserted by loading-attribute and last-photo request checks) and T-01-25 (alt and labels are React text from `carName`) are mitigated as planned.

## Risks to know
- Keyboard focus is lost when "Next photo" unmounts at the last photo (the plan says not to render it there).
- The scroller is not itself focusable and the photo links are `tabindex=-1`, so on touch-only screen-reader use the only way to move between photos is swiping. Arrows cover keyboard on pointer devices only.

## Self-Check: PASSED
Files exist: `PhotoCarousel.tsx`, `PhotoCarousel.test.ts`, `ListingCard.tsx`, `e2e/carousel.spec.ts`. Commits 029b3ca and 98f7f3f are on `feat/phase-1-stock-browsing`.
