---
phase: 03-leads-finance-and-saved-cars
plan: 06
subsystem: leads
status: complete
tags: [neon, drizzle, migrations, pglite, retention, tracer, decision]
requires:
  - "03-04: LeadRow, LeadStore, processLead"
  - "03-05: requireEnv"
provides:
  - "leads table (src/lib/db/schema.ts) and the first migration drizzle/0000_leads.sql"
  - "getDb() lazy Neon HTTP client in src/lib/db/index.ts"
  - "createDrizzleStore(db) in src/lib/leads/store.ts, wired into the real deps"
  - "src/test/pglite-db.ts stand-in and process.int.test.ts"
  - "CI drizzle-kit check and scripts/check-migrations.sh; deploy.yml migrates before the build"
  - "LEAD_RETENTION_MONTHS, .env.example, docs/lead-retention.md"
affects: [03-08, 03-10, 03-11, 03-13, 03-15, "#20 admin"]
tech-stack:
  added: []
  patterns: ["lazy memoised db getter", "PGlite integration tests through vi.mock('@/lib/db')", "additive-only migrations gate"]
key-files:
  created: [drizzle.config.ts, drizzle/0000_leads.sql, drizzle/meta/_journal.json, drizzle/meta/0000_snapshot.json, src/lib/db/schema.ts, src/lib/db/index.ts, src/lib/leads/store.ts, src/test/pglite-db.ts, src/lib/leads/process.int.test.ts, scripts/check-migrations.sh, .env.example, docs/lead-retention.md]
  modified: [src/lib/leads/deps.ts, src/lib/leads/schema.ts, .github/workflows/ci.yml, .github/workflows/deploy.yml]
decisions:
  - "Leads columns: research-columns (D-03 plus id, client_ref, car_title, car_price_eur, details, photo_keys, notified_at, created_at). Overnight decision, logged on #47"
  - "The migration is generated and committed but NOT applied to any database"
  - "The real store is built per call so a missing DATABASE_URL throws inside processLead and gets an error log line"
metrics:
  duration: 25m
  completed: 2026-11-06
estimate:
  tokens: 82000
actuals:
  tokens: 6400
  tasks: 3
  commits: 1
plan_head_before: d20e7fbc21073d51efeabe58b68c7170f09d01c4
plan_head_after: 585aba3b9ae822c4ab86351096b01072620b0d1a
---

# Phase 3 Plan 06: Leads table and Neon store Summary

An enquiry now lands as one row in a real Postgres `leads` table through a Drizzle store, proven on PGlite with the committed migration; CI checks migrations stay additive, deploys migrate Neon before the new code, and the 12-month retention has a written runbook.

## Task 1 decision: leads columns (D-03, one-way door)

**Chosen:** `research-columns`, the recommended option. The owner was asleep; per the standing overnight instruction the recommended option was taken and logged on #47 with the reason and how to undo: https://github.com/CristianGaudino/cartwright/issues/47#issuecomment-6698729869

| Column | Postgres type | Null | Default |
|---|---|---|---|
| id | uuid primary key | not null | gen_random_uuid() (the server sets it) |
| client_ref | uuid, unique `leads_client_ref_unique` | not null | |
| type | text ($type LeadType) | not null | |
| status | text ($type LeadStatus = "new") | not null | 'new' |
| car_id | text | null | |
| car_slug | text | null | |
| car_title | text | null | |
| car_price_eur | integer | null | |
| source_path | text | not null | |
| name | text | not null | |
| phone | text | null | |
| email | text | null | |
| message | text | null | |
| details | jsonb | not null | '{}' |
| photo_keys | text[] | not null | '{}' |
| consent_at | timestamptz | not null | |
| consent_version | text | not null | |
| notified_at | timestamptz | null | |
| created_at | timestamptz, index `leads_created_idx` | not null | now() |

No IP, user agent or bot-check token column (LED-03; `grep -ciE "ip_address|user_agent|turnstile" drizzle/*.sql` prints 0).

**Not applied:** `drizzle/0000_leads.sql` exists only on `feat/lead-forms`. It was never run against Neon or any real database (none exists; 03-02 is not done). It runs only in tests, on PGlite.

## A13: `process.loadEnvFile` inside drizzle-kit

Works. With a throwaway `.env.local` holding a probe URL to `127.0.0.1:1` (no database there), `drizzle-kit migrate` picked the URL up and tried to connect; without the file it stopped with `url: ''`. The file was deleted straight after. No dotenv needed. The esbuild postinstall held back in 03-04 did not matter: drizzle-kit 0.31.11 generated and checked with no script approval, so nothing was approved.

## What was built

- `src/lib/db/schema.ts`: the table above. `drizzle.config.ts`: vintage's, with `process.loadEnvFile(".env.local")` in try/catch instead of dotenv.
- `src/lib/db/index.ts`: `server-only`, `getDb()` builds `drizzle(neon(requireEnv("DATABASE_URL")), { schema })` on first call and memoises it.
- `src/lib/leads/store.ts`: `createDrizzleStore(db)` typed on `PgDatabase`, so neon-http and PGlite both fit. `exists` selects by client_ref, `insert` uses `onConflictDoNothing` on client_ref with `returning({ id })`, `markNotified` sets `notified_at`. No batch or transaction.
- `src/lib/leads/deps.ts`: real store methods call `createDrizzleStore(getDb())` per call, so a missing `DATABASE_URL` throws inside `processLead` (one `error` log line) rather than in `getDeps()`, where the action's catch would swallow it unlogged.
- `src/test/pglite-db.ts`: vintage's file cut down: applies `drizzle/*.sql`, exports `getDb` and `truncate`. Dropped vintage's batch shim and fake `__drizzle_migrations` table, since nothing here uses batch or reads the migrations table.
- `process.int.test.ts` (6 tests on PGlite): a valid enquiry with forged title and price stores the provider's snapshot, source path, consent time and version, status `new`, empty details and photo keys, and `notified_at` after the mail; the same client ref twice gives one row and two ok; `Promise.all` of two submits with one client ref gives two ok, one row, one mail; a mailer throwing `E_DAILY_LIMIT_EXCEEDED` gives ok and `notified_at` null; honeypot and sold car store nothing; `\n` and `\r\n` line breaks survive.
- `scripts/check-migrations.sh`: vintage's, only the workflow name in the comment changed; executable in git.
- `ci.yml` check job: `npx drizzle-kit check`, then `bash scripts/check-migrations.sh "${{ github.base_ref }}"` as vintage calls it.
- `deploy.yml`: "Migrate the database" (`npx drizzle-kit migrate`, `DATABASE_URL: ${{ secrets.DATABASE_URL }}`) after `npm test` and before `npx opennextjs-cloudflare build`.
- `LEAD_RETENTION_MONTHS = 12` in `src/lib/leads/schema.ts`; `.env.example` with four names and no values; `docs/lead-retention.md` with the period, monthly purge, erasure recipe, and the "Leads that were not emailed" section.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/leads` | exit 0, 20 tests, process.int.test.ts in the run |
| `npm test` | exit 0, 13 files, 269 tests |
| `npx drizzle-kit check` | exit 0 |
| `bash scripts/check-migrations.sh main` (after commit; sees `drizzle/0000_leads.sql` as added) | exit 0 |
| `npm run typecheck`, `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `PORT=3157 npx playwright test e2e/leads.spec.ts` | 3 passed |
| `.env.example` names-only greps | nothing printed; 4 names |

## Deviations from Plan

**1. [Checkpoint resolved by standing instruction] Task 1** was a blocking-human decision. The owner was asleep and the orchestrator's overnight rule says to take the recommended option and log it on #47; done.

**2. [Rule 2 - Observability] Real store built per call** instead of `store: createDrizzleStore(getDb())` evaluated in `getDeps()`. The literal call is still there; it just runs inside each method, so configuration errors are logged by `processLead`.

**3. [Simplification] pglite-db.ts** has no batch shim or migrations table (not used).

## For the owner (before this branch merges)

- Create the Neon project (Frankfurt), then set the `DATABASE_URL` GitHub Actions secret and Worker secret (main branch), and a dev branch URL in your own `.env.local`. **Until the GitHub secret exists, a deploy from main stops at the migrate step.**
- Confirm the 12-month retention period with the dealer.
- Reply on #47 if you want different columns; free until merge.

## Known Stubs

None in this plan's files. The real path is complete but untested against Neon and Email Service until 03-02 provisioning.

## Threat Flags

None beyond the plan's register. T-03-13 (store errors go to processLead's catch, which logs three keys), T-03-14 (Drizzle parameters only), T-03-15 (check-migrations.sh plus migrate before build), T-03-16 (unique client_ref, onConflictDoNothing, concurrent test) and T-03-17 (constant and runbook) are in place.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 2 and 3 | 585aba3 | drizzle.config.ts, drizzle/, src/lib/db/{schema,index}.ts, src/lib/leads/{store,deps,schema,process.int.test}.ts, src/test/pglite-db.ts, scripts/check-migrations.sh, .github/workflows/{ci,deploy}.yml, .env.example, docs/lead-retention.md |

## Self-Check: PASSED

- FOUND: all 12 created files listed in key-files
- FOUND: commit 585aba3 in HEAD
- `ls drizzle/*.sql` lists one file; `drizzle/meta/_journal.json` exists
