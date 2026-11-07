---
phase: 02-car-pages-and-discovery
plan: 02
subsystem: seo-indexing
tags: [seo, robots, sitemap, app-env, next16]
requires: ["02-01"]
provides:
  - "src/lib/site.ts: SITE_URL, SITE_NAME, DEALER_PHONE, DEALER_TEL, indexable()"
  - "APP_ENV inlined by next.config.ts env for request-time pages"
  - "Root layout metadataBase and site-wide robots default"
  - "robots.txt (production vs share-preview-only), dynamic /sitemap.xml, /used-cars canonical and query-string noindex"
affects: [02-03, 02-04, 02-07]
tech-stack:
  added: []
  patterns: ["indexable() is the only reader of APP_ENV", "build-time env inlined for the Worker"]
key-files:
  created:
    - src/lib/site.ts
    - src/app/sitemap.ts
    - e2e/indexing.spec.ts
  modified:
    - next.config.ts
    - src/app/layout.tsx
    - src/app/robots.ts
    - src/robots.test.ts
    - "src/app/used-cars/[slug]/page.tsx"
    - "src/app/used-cars/(browse)/page.tsx"
key-decisions:
  - "SITE_NAME is Carright (rebrand), not Carright from the UI-SPEC copy"
  - "DEALER_PHONE is the number cartwright.ie publishes, flagged to confirm with the dealer"
  - "Sitemap has no lastmod and no photos; one stock.query with pageSize 1000 (shortcut comment)"
requirements-completed: [CAR-03]
status: complete
duration: ~25 min
completed: 2026-11-06
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 81c402d3839864d784fd353c47410b142036c675
plan_head_after: f9e2aa717bd158d4c741381ddafca7b4c9ffddc1
---

# Phase 2 Plan 02: Indexing follows the environment Summary

Production builds are indexable at request time with a robots.txt and live sitemap; the demo (`APP_ENV=demo`) and any other build serve noindex everywhere, an empty sitemap, and a robots.txt that lets only the three share-preview bots in.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: APP_ENV from build to a car page's robots meta, proven on a production and a demo build | f4d217f |
| 2 | robots.txt, dynamic sitemap, list page canonical | f9e2aa7 |

Tracer gate: `<verify>` (tsc, lint, production build + `e2e/indexing.spec.ts`, demo build + same spec) re-run end to end after Task 1 and passed before Task 2.

## Verification (exit codes)

- `npm test` 213 passed; `npx tsc --noEmit` 0; `npm run lint` 0.
- `APP_ENV=production` build: `e2e/indexing.spec.ts` (4) + `e2e/stock.spec.ts` (14) all pass.
- `APP_ENV=demo` build: `e2e/indexing.spec.ts` (4) pass.
- Acceptance greps: `process.env.APP_ENV` appears only in `src/lib/site.ts` (plus the plan-mandated `next.config.ts`; `robots.ts` now goes through `indexable()`); no `index: false` on the car page; no `lastmod`/`shortcut: noindex` in `src/app`.
- The sitemap spec confirms every unsold car is listed and the oldest sold car (always expired) is not.

## Deviations from Plan

None to scope. Notes:

1. **Port 3000 was taken:** another project (Blacktail Archive) was serving on 3000, so Playwright's `reuseExistingServer` tested the wrong site. Ran the e2e with `PORT=3111`. No config change.
2. **Worktree base:** HEAD was 4f1f0e2; reset to the 02-01 merge 81c402d as instructed (clean, no commits).
3. **Setup:** `npm ci` and `npx next typegen` run in the fresh worktree (typegen needed before `tsc`).
4. **Plan-head ledger file not written:** the sandbox refused writing into the shared git dir; `plan_head_before` is the known base SHA, and `commits: 2` is `rev-list --count` from it.
5. **Branch:** commits are on the worktree branch, not `feat/car-pages`; the orchestrator owns the PR branch.

## Notes for later plans

- 02-03 must set `APP_ENV=demo` in `deploy.yml` for the demo deploy and add the Worker curl checks (no noindex on a car page, sitemap non-empty). `/gone` (referenced by robots) is created there.
- The robots.txt production `Disallow: /gone` and the 410 body at `/gone` depend on 02-03.
- Viewing `/sitemap.xml` on a Windows machine cannot be proven on the Worker (Pitfall 7); only the Node server was tested.

## Known Stubs

None.

## Threat Flags

None. T-02-05 to T-02-07 mitigations are in place: `env` has exactly one key (`APP_ENV`), query-string lists are noindex with one canonical, and the demo serves noindex, an empty sitemap and a share-bot-only robots.txt (proven on a demo build).

## Self-Check: PASSED

- Commits f4d217f and f9e2aa7 exist on the branch.
- Created files exist: src/lib/site.ts, src/app/sitemap.ts, e2e/indexing.spec.ts.
