---
phase: 02-car-pages-and-discovery
plan: 03
subsystem: gone-not-found
tags: [http-410, proxy, not-found, ci, worker, next16]
requires: ["02-01", "02-02"]
provides:
  - "src/proxy.ts: expired car slugs answer HTTP 410 by rewrite to /gone/{make}"
  - "/gone/[make]: noindex 410 body linking to the make page and /used-cars"
  - "Root not-found page and used-cars/[slug]/error.tsx (load error with retry)"
  - "CI worker job checks: expired 410, never-known 404, sitemap, indexable live car, robots Sitemap line"
  - "Demo deploy builds with APP_ENV=demo"
affects: [02-04, 02-05, 02-07]
key-files:
  created:
    - src/proxy.ts
    - src/app/gone/[make]/page.tsx
    - src/app/not-found.tsx
    - src/app/used-cars/[slug]/error.tsx
    - e2e/gone.spec.ts
  modified:
    - .github/workflows/ci.yml
    - .github/workflows/deploy.yml
key-decisions:
  - "error.tsx uses Next 16.4.5's documented retry() prop instead of useTransition plus router.refresh"
requirements-completed: [CAR-02, CAR-03]
status: complete
completed: 2026-11-06
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 9503f0a863093077cbc68d22226d3b4a7614eeb4
plan_head_after: f2b3d11d678b5e8f5dcf186f9d3378004e4781bf
---

# Phase 2 Plan 03: 410 for expired cars, 404 page, Worker proof in CI Summary

Expired car URLs now answer a real HTTP 410 through a Node proxy rewrite, unknown URLs get the 404 copy, car and landing URLs get a retryable load error, and the CI worker job checks all of it (plus sitemap and indexability) on the real Worker build.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: expired car URL answers 410 with its own page | 533b41d |
| 2 | 404 and error pages, Worker proof in CI, demo deploy env | f2b3d11 |

Tracer gate: `tsc`, lint, production build and `playwright test e2e/gone.spec.ts e2e/stock.spec.ts` re-run after Task 1 and passed before expanding.

## Verification

- `npm test` 219 passed; `npm run typecheck` (next typegen + tsc) exit 0; `npm run lint` exit 0.
- `APP_ENV=production npm run build` then the full Playwright suite on PORT=3113: 73 passed (includes `e2e/gone.spec.ts`, `stock.spec.ts`, `indexing.spec.ts`).
- Local curl against `next start` with APP_ENV=production: sitemap lists the live car, the live car page has no `noindex`, robots.txt has the `Sitemap:` line. These are the same assertions the CI worker job makes.
- Acceptance greps: `status: 410`, `stock.lookup(`, `matcher` in proxy.ts; 0 `console.` in proxy.ts and error.tsx; no `loading.tsx` under `used-cars/[slug]`; `index: false` and `notFound()` in the gone page; ci.yml keeps `x-robots-tag`, `e2e-forced-failure`, `/used-cars/not-a-car 404`; deploy.yml has `APP_ENV: demo` and no `APP_ENV: production`.
- NOT proven here: the Worker. This Windows machine cannot run the OpenNext build (Pitfall 7). The 410 on Workers (OpenNext's experimental Node proxy, Assumption A2) is proven only by the CI worker job on the #6 PR. If the 410 case fails there, the plan's fallback is `src/middleware.ts` with `runtime: "experimental-edge"`; if that fails too, stop and report with the curl output.

## Deviations from Plan

**1. [Rule 1 - Docs] `error.tsx` uses `retry()`, not `useTransition` + `router.refresh()`.**
- Found during: Task 2, reading `node_modules/next/dist/docs/.../error.md`.
- Issue: in Next 16.4.5 the error boundary receives `retry` (re-fetch and re-render the segment); `reset` only clears state without re-fetching, so the plan's refresh-in-a-transition pattern would also need `reset`. `retry` is the documented recovery.
- Fix: button calls `retry()`. Copy, headings and button labels are as specified.
- Files: `src/app/used-cars/[slug]/error.tsx`.

**2. [Test adjustment] robots meta assertion uses `.first()`.** The 410 page renders two identical `noindex` robots metas (the layout's and the page's) when `APP_ENV` is not production, so a strict locator failed. Both are `noindex`; the assertion passes under both envs.

Dispatch notes: worktree HEAD was 4f1f0e2 and was reset to 9503f0a as instructed. Commits are on the worktree branch, not `feat/car-pages`.

## Notes for later plans

- The 410 page's `See more {Make}` links to `/used-cars/{makeSlug}`, which is a 404 on the demo until plan 02-07 (#8) adds make landing pages. Say so in the #6 PR.
- The proxy only handles `/used-cars/:slug`. It runs the provider lookup only for slugs ending in `-digits`, so make and body landing slugs skip it.
- Record the CI worker job result for the 410 / 404 / sitemap / indexable checks in the 02-05 SUMMARY once the PR runs.

## Known Stubs

None.

## Threat Flags

None. T-02-08 (bounded regex, constant `/gone/` plus provider make slug, no query or headers), T-02-09 (unknown make 404, noindex), T-02-10 (no logging in proxy or error.tsx) mitigated as planned.

## Self-Check: PASSED

- Files exist: src/proxy.ts, src/app/gone/[make]/page.tsx, src/app/not-found.tsx, src/app/used-cars/[slug]/error.tsx, e2e/gone.spec.ts.
- Commits 533b41d and f2b3d11 are on the branch.
