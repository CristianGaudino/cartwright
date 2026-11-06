# Phase 3: Leads, Finance and Saved Cars - Research

**Researched:** 2026-11-06
**Domain:** Lead capture on Next.js 16 + OpenNext on Cloudflare Workers (Neon/Drizzle, Cloudflare Email Service, Turnstile, R2), a pure-maths finance calculator, localStorage saved cars
**Confidence:** MEDIUM-HIGH (stack and flow verified against Cloudflare/Neon/Next docs and the vintage reference repo; four items need a Wave 0 spike on `wrangler dev`, listed in Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The Phase 1 UI-SPEC tokens, type and motion still apply. Write the UI contract (e.g. `/gsd-ui-phase 3`) before building UI, per CLAUDE.md. Sold cars never show enquiry/test drive/reserve (Phase 2 D-05).

**Lead delivery and storage (LED-01, LED-02, LED-03)**
- **D-01:** Email is sent with **Cloudflare Email Service** (owner's choice over Resend). The researcher must confirm it can send to an arbitrary external recipient from a Worker and what domain verification it needs; if it cannot, stop and ask the owner rather than switching silently. Reversibility: reversible, one send function behind an interface.
- **D-02:** Demo leads go to the owner's inbox via a `LEAD_TO_EMAIL` secret. Subject is prefixed `[DEMO]` when `APP_ENV` is not production. Switching to the dealer is a config change.
- **D-03:** Neon Postgres + Drizzle is introduced here. Each lead is a **full row**: type, car id and slug snapshot, source page, contact details, message, consent timestamp and consent wording version, status. The email is a notification; the row is the record (future admin inbox, #20). Reversibility: one-way, the schema is a migration target for the admin area and holds real personal data.
- **D-04:** Retention is a fixed period of **12 months**, a constant in code, stated in the privacy copy. The deletion job is deferred to the admin phase; flag the period for the dealer to confirm.

**Spam, consent, logging (LED-01, LED-03)**
- **D-05:** Cloudflare **Turnstile**, **Managed widget with appearance `interaction-only`**: invisible for most visitors, a challenge shows only when Cloudflare needs one. Verified server-side, plus a hidden honeypot field. Per-IP rate limiting only if the researcher finds it cheap on Workers. (Amended 2026-11-06 by the owner; CONTEXT.md is the source.)
- **D-06:** A required, unticked consent checkbox with one plain line linking to the privacy page. Store timestamp and wording version.
- **D-07:** No marketing opt-in. Lead data is used only to answer the request (newsletter and alerts are Backlog).
- **D-08:** Never log payloads. Log only lead id, type and outcome. Errors are caught and rethrown without the body. A **test asserts it, and a lint rule forbids `console.*` in the lead code paths.** Reversibility: reversible.

**Form UX and shared pattern (LED-01, LED-02, LED-06)**
- **D-09:** Enquiry, test drive and reserve open from buttons in the Phase 2 reserved action area into a **native `<dialog>`** (sheet on phone, centred on desktop), reusing the lightbox and filter-sheet pattern. No layout shift.
- **D-10:** **One shared form** with a type picker. Common fields: name, phone, email, message. Test drive adds preferred day and time; reserve adds a short note. One component, one server action, validated server-side with clear field errors. Trade-in, sourcing and finance reuse the same shell (LED-06). Reversibility: costly, every later form builds on this component and action.
- **D-11:** Reserve is a **request, not a hold**. Wording is "Request to reserve"; the dealer confirms by phone. No payment or deposit in v1.
- **D-12:** Name is required, plus **at least one of phone or email**.

**Trade-in and sourcing (LED-04, LED-05)**
- **D-13:** Trade-in photos are optional, **up to 12 images** (owner raised it from 5: do not limit valuations), stored in **Cloudflare R2**, with a link kept in the lead. Validate type and size server-side, private bucket. The researcher sets per-file and total size caps and says how the dealer email links to them (signed URLs).
- **D-14:** Trade-in captures reg, mileage and optional make, model, year as plain fields. No paid reg-lookup API in v1.
- **D-15:** Own pages **/sell-your-car** and **/find-a-car**, linked from the header or footer and from Phase 2 empty landing pages (replacing the plain `/used-cars` link noted in 02-CONTEXT D-08).

**Finance (FIN-01, FIN-02, FIN-03)**
- **D-16:** The calculator takes price, deposit, term and APR. Defaults live in one config file marked **PLACEHOLDER**, with a visible "representative only" note. The dealer's real terms and required wording replace it when supplied (client input still open, #9). Never invent APRs or terms.
- **D-17:** The finance application is saved as a lead and collects name, contact, deposit, term, employment status and consent. **No income, date of birth or bank details.**

**Saved cars (SAV-01, SAV-02)**
- **D-18:** The heart sits in the top corner of the card photo at **`z-20`**, above the carousel's `z-10` and never under the card's stretched title link, and next to Share on the car page. 44px target, `aria-pressed`. (Amended 2026-11-06 by the owner.)
- **D-19:** **/saved** reuses the ListingCard grid, reads ids from localStorage and fetches those cars by id from the provider. Empty state links to `/used-cars`. Noindex. The header shows the count.
- **D-20:** A saved car that sells stays in the list with the Sold badge. A removed car drops out, its id is pruned from storage, and a short "No longer available" note shows once.
- **D-21:** Store **car ids only**, one key, synced across tabs via the `storage` event. No snapshot. The header count slot is reserved at a fixed width from the server render, and the number **fades in over 150 ms after hydration, with no layout shift**. (Amended 2026-11-06 by the owner.)

### Claude's Discretion
Dialog internals, field order and microcopy, Turnstile integration details, Drizzle layout, R2 key naming and size caps, email template, heart icon, within the UI-SPEC tokens and the plain-text, no em dash rules.

### Deferred Ideas (OUT OF SCOPE)
- **Dealer WhatsApp trade-in flow (owner, future development):** WhatsApp Business Platform (Cloud API), reply-to-lead mapping. Phase 3 stores trade-in leads with photo links so this can build on them.
- Lead deletion job after the retention period: admin phase (#20).
- Marketing opt-in, alerts, newsletter: Backlog (#17, #19).
- Online deposit or payment for reservations: not in v1.
- Reg lookup API for trade-ins: not in v1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LED-01 | Enquiry / test drive / reserve; validated server-side, spam-protected, stored in Neon, emailed | `processLead` flow, zod discriminated union, Turnstile + honeypot + Workers rate-limit binding, Neon HTTP + Drizzle, Cloudflare Email binding |
| LED-02 | Every lead records the car and source page | Server re-reads the car by id from `stock.getById`, stores snapshot columns; `source_path` validated pathname |
| LED-03 | Consent, minimal, never logged | `CONSENT` constant + version, no-console lint scope, `DrizzleQueryError` leak finding, log allow-list type, logging test |
| LED-04 | Trade-in valuation (reg, mileage, optional photos) | Photos in the same server action FormData to R2 binding, magic-byte checks, client re-encode, HMAC-signed dealer links |
| LED-05 | Request a car not in stock | `sourcing` type in the same union/action |
| LED-06 | Valuation and sourcing reuse the shared pattern | One `LeadForm` shell + one action + per-type zod branch + shared `processLead` |
| FIN-01 | Calculator that works | `monthlyPayment` pure function, test vectors computed this session |
| FIN-02 | Representative labels, dealer wording, no invented terms | `finance.config.ts` with `placeholder` flag, production-guard test, Irish advertising-of-credit flag |
| FIN-03 | Finance application saved as a lead | `finance` type in the union, `details` jsonb |
| SAV-01 | Save/unsave without sign-in | `useSyncExternalStore` store over one localStorage key |
| SAV-02 | Header count + saved page persisted | Same store, `SavedLink`, `/api/saved-cars` by-id route + prune |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

From `C:/Git/cartwright/.claude/CLAUDE.md` [VERIFIED: file read this session]:
- Stack is fixed: Next.js 16 App Router, **Cache Components OFF** (opennextjs-cloudflare#1450), Tailwind v4, Cloudflare Workers via OpenNext, GitHub Actions. Neon + Drizzle **only for leads**; no auth on the public site; saved cars in localStorage.
- Read `node_modules/next/dist/docs/` before writing Next code (done for server actions, forms, `serverActions` config; planner tasks must reread the relevant guide).
- Git: branch off `main`, PR against `main`, one issue per PR with `Closes #n`, stage named files, never push `.env*`/`test-results/`/`playwright-report/`, never merge a PR, fewer finished commits (Actions minutes are limited).
- Before a PR: run `/ponytail:ponytail-audit`, then lint, typecheck, unit tests and the E2E spec against a production build; check by exit code (`npm run lint; echo $?`, `npm test`, `npm run build`, `npx tsc --noEmit`).
- Product rules: plain short text, **no em dashes anywhere on the site**; drop helper text a label already says; finance figures representative only with the dealer's wording, never invent APRs or terms; real customer data collected with consent, kept minimal, **never logged**; mobile first.
- Every merge to `main` deploys to production (`deploy.yml`, `APP_ENV: demo` today).
- The vintage repo is the standard to follow; it is on GitHub (`CristianGaudino/vintage`) but **not on disk** at `~/Developer/vintage`. Read via `gh api` this session.

## Summary

Everything the phase needs runs on Cloudflare bindings plus one external database, and the vintage repo has already solved the hard parts of the same stack (Neon HTTP + Drizzle on OpenNext Workers, PGlite integration tests, additive-only migration check, migrate-before-deploy). Follow it: `@neondatabase/serverless` `neon()` over HTTP with `drizzle-orm/neon-http`, `drizzle-kit generate` migrations committed in `drizzle/`, `scripts/check-migrations.sh`, PGlite for integration tests. Cloudflare Email Service **can** send to an arbitrary recipient from a Worker via an `env.EMAIL.send()` binding, but only on **Workers Paid** and only after a sending domain is onboarded (Cloudflare DNS required). It is in **public beta** (since 2026-04-16). So D-01 stands, with two owner preconditions (paid plan; onboard a domain on Cloudflare DNS, `cgaudino.com` qualifies). No stop-and-ask is triggered unless the owner declines the paid plan.

The single design call this research makes beyond CONTEXT: **trade-in photos travel in the same server-action FormData as the lead** (client re-encodes each to a ~2000px JPEG, which also strips EXIF/GPS), the action writes them to a private EU-jurisdiction R2 bucket through the **R2 binding**, and the dealer email links to them through an **HMAC-signed Next route handler** (no S3 credentials, no aws4fetch, no CORS, no orphan files, one Turnstile token). The cost is that per-tile upload progress and the "Could not upload / Try again" tile state in 03-UI-SPEC cannot exist (a server action has no progress events); 03-UI-SPEC explicitly allows this fallback ("if upload happens only on submit, the per-photo bar becomes one overall bar"), and with no looping animation allowed the overall state is just the `Sending` button label. The vintage-style presigned browser upload is the alternative if the owner wants real per-photo progress (see Alternatives).

Two findings are easy to miss and matter for LED-03 (never log personal data): (1) **`DrizzleQueryError` puts the query parameters in its `message`** (`Failed query: ${query}\nparams: ${params}`), so any logged or rethrown Drizzle error leaks the lead; (2) React 19 **resets uncontrolled form fields after any form action finishes, including after a validation error**, which breaks the UI-SPEC rule "typed values are never cleared by an error"; submit through `onSubmit` + `startTransition` with controlled state instead of `<form action>`/`useActionState`.

**Primary recommendation:** Build `processLead(input, deps)` as one framework-free function (honeypot, rate limit, zod, Turnstile, photo checks, idempotent insert, email, sanitised logging) with injected `store`, `mailer`, `bucket`, `limiter`, `verifyTurnstile`; wire real Cloudflare/Neon deps in one server action; integration-test it on PGlite with fake deps; E2E the UI with an env-flagged fake dependency set. Ship #11 first (DB, email, form shell, Turnstile), then #12 on the same action, #9 on the same action, #10 independently.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lead form UI, dialog, type picker, field errors | Browser / Client | Frontend Server (SSR shell) | Native `<dialog>`, in-memory typed values, Turnstile widget are client-only |
| Validation (authoritative) | API / Backend (server action) | Browser (pre-check, same zod schema) | Server is the trust boundary; the client reuses the schema only to save a round trip |
| Spam control (honeypot, Turnstile verify, rate limit) | API / Backend | CDN / Edge (Turnstile script, Workers rate-limit binding) | Token must be verified server-side; limiter is a Worker binding |
| Lead persistence | Database / Storage (Neon) | API / Backend | Row is the record (D-03) |
| Email notification | API / Backend (Worker `EMAIL` binding) | none | Notification only; failure must not fail the lead |
| Trade-in photo storage | Database / Storage (R2, EU) | API / Backend (binding writes) | Private bucket, no public address |
| Trade-in photo downscale / EXIF strip | Browser / Client | none | Cuts body size and removes GPS before it leaves the device |
| Dealer photo access | API / Backend (signed route handler) | Database / Storage | Short-lived HMAC link to a private object |
| Finance maths | Browser / Client | Shared pure module | No request; also unit tested in Node |
| Saved ids | Browser / Client (localStorage) | none | No account; server never sees them except as a by-id lookup |
| Saved cars lookup by id | API / Backend (route handler over `stock.getById`) | Browser (renders `ListingCard`) | Stock provider is server-only (JSON import must not enter the client bundle) |
| Header count, hearts | Browser / Client | Frontend Server (renders empty slot) | Server snapshot is "nothing saved"; hydration fills the number |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.4 [VERIFIED: npm registry, published 2026-10-21 modified] | Typed queries, schema | Same version vintage ships; `neon-http` driver |
| `drizzle-kit` (dev) | 0.31.11 [VERIFIED: npm registry] | `generate` / `migrate` / `check` | Same as vintage |
| `@neondatabase/serverless` | 1.2.0 [VERIFIED: npm registry] | `neon()` HTTP driver | Neon: "Use the driver over HTTP by default"; fits Workers because no socket outlives a request [CITED: neon.com/docs/serverless/serverless-driver] |
| `zod` | 4.6.7 [VERIFIED: npm registry] | One schema for server validation and client pre-check | Next forms guide uses it; vintage uses ^4.6.7. `z.flattenError(err)` returns `{formErrors, fieldErrors}` [VERIFIED: ran in scratch install this session] |
| `@electric-sql/pglite` (dev) | 0.5.15 [VERIFIED: npm registry] | In-memory Postgres for integration tests | Vintage pattern (`src/test/pglite-db.ts`) |
| `server-only` | 0.0.1 [CITED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:587 `npm install server-only`] | Fail the build if a server module is imported by a client file | Next docs recommend it |

Not new dependencies: Cloudflare Email, R2, rate limiting and Turnstile are bindings or a plain `fetch`. Do **not** add `@marsidev/react-turnstile` (a 30-line hook is enough and avoids a dependency), `aws4fetch` (the R2 binding replaces S3 signing), `dotenv`/`tsx` (Node 24 has `process.loadEnvFile`), or `@cloudflare/workers-types` (hand-write three small structural interfaces to avoid DOM/workers type clashes).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Photos in the server action (recommended) | Vintage-style presigned browser PUT to R2 (`aws4fetch`, S3 token, bucket CORS) | Gives real per-photo progress and the exact 03-UI-SPEC tile states; costs S3 credentials, CORS, an anonymous presign endpoint needing its own rate limit, orphan-file cleanup, and a second Turnstile token or none |
| Photos in the server action | Route handler `POST /api/trade-in` via XHR | Real overall progress bar, bypasses the Next 1 MB action cap, but a second transport and hand-written CSRF/Origin check; violates "one server action" |
| `neon()` HTTP | Hyperdrive + `pg` | Needed only for interactive transactions or very hot paths; not for single-row inserts |
| Workers rate-limit binding | Postgres upsert counter (vintage `checkRateLimit`) | DB version is exact and portable but costs a DB round trip per request and stores a per-IP key (personal data) |
| Hand-written Turnstile hook | `@marsidev/react-turnstile` | Saves ~30 lines, adds a dependency flagged SUS by the gate |

**Installation:**
```bash
npm install drizzle-orm @neondatabase/serverless zod server-only
npm install -D drizzle-kit @electric-sql/pglite
```

**Version verification:** versions above come from `npm view <pkg> version` run this session (2026-11-06) and match vintage's `package.json` (`drizzle-orm ^0.45.4`, `@neondatabase/serverless ^1.2.0`, `zod ^4.6.7`, `drizzle-kit ^0.31.11`, PGlite ^0.5.9) [VERIFIED: gh api repos/CristianGaudino/vintage/contents/package.json].

### Platform pieces (config, not packages)
| Piece | Config | Source |
|-------|--------|--------|
| Email | `"send_email": [{ "name": "EMAIL" }]` | [CITED: developers.cloudflare.com/email-service/api/send-emails/workers-api/]; schema confirms keys `name`, `destination_address`, `allowed_destination_addresses`, `allowed_sender_addresses`, `remote` [VERIFIED: node_modules/wrangler/config-schema.json:493-533] |
| R2 | `"r2_buckets": [{ "binding": "LEAD_PHOTOS", "bucket_name": "...", "jurisdiction": "eu" }]` | `jurisdiction` is a documented field [CITED: developers.cloudflare.com/r2/reference/data-location/], present in schema [VERIFIED: config-schema.json:736] |
| Rate limit | `"ratelimits": [{ "name": "LEAD_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }]` | `period` must be 10 or 60; wrangler >= 4.36.0 [CITED: developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/]; wrangler here is 4.157.0 [VERIFIED: wrangler --version] |

## Package Legitimacy Audit

Run with `gsd-tools query package-legitimacy check --ecosystem npm ...` this session.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `drizzle-kit` | npm | years | 40.8M/wk | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `@neondatabase/serverless` | npm | years | 7.2M/wk | github.com/neondatabase/serverless | OK | Approved |
| `drizzle-orm` | npm | years | 47.4M/wk | github.com/drizzle-team/drizzle-orm | SUS (`too-new`: latest release 2026-10-08) | Flagged, planner adds `checkpoint:human-verify` |
| `zod` | npm | years | 453M/wk | github.com/colinhacks/zod | SUS (`too-new`: latest release 2026-10-12) | Flagged, planner adds `checkpoint:human-verify` |
| `@electric-sql/pglite` | npm | years | 39M/wk | (repo present) | SUS (`too-new`: latest release 2026-11-03) | Flagged (dev only), planner adds `checkpoint:human-verify` |
| `server-only` | npm | 4 yrs | 33.6M/wk | none listed (React team package, maintainer sebmarkbage) | SUS (`no-repository`) | Flagged, planner adds `checkpoint:human-verify` |

`drizzle-orm`, `zod`, `pglite` `[WARNING: flagged as suspicious, verify before using.]` The only signal is that the **latest release** is recent; the packages are long established with tens of millions of weekly downloads, none has a `postinstall` script (`npm view <pkg> scripts.postinstall` empty for drizzle-orm, @neondatabase/serverless, aws4fetch, pglite). The checkpoint can be satisfied by confirming the versions match vintage's lockfile. `server-only` `[WARNING: flagged as suspicious, verify before using.]` (no repo URL; React-team maintained and referenced by the Next docs).

**Packages removed due to SLOP verdict:** none
**Packages flagged SUS:** drizzle-orm, zod, @electric-sql/pglite, server-only (planner inserts one `checkpoint:human-verify` before the install task)
**Not recommended (avoided):** `@marsidev/react-turnstile` (SUS, `too-new`), `aws4fetch`, `dotenv`, `tsx`.

All packages above were discovered from the vintage `package.json` (the owner's own repo) and Next/Neon docs, and confirmed by the legitimacy seam; tagged accordingly.

## Architecture Patterns

### System Architecture Diagram

```
 Browser                                   Cloudflare Worker (OpenNext, Next 16)                 External
 -------                                   --------------------------------------                 --------
 car page / dialog / form page
   |  (Turnstile script loads on first focus)  ------------------------------------------------>  challenges.cloudflare.com
   |  token from callback                      <------------------------------------------------   (token, 300 s, single use)
   |
   |  onSubmit -> FormData(fields + token + honeypot + photos[] re-encoded to JPEG)
   v
 submitLead (server action, 'use server' file)
   |
   |-- 1 honeypot filled? ------------------> return {ok} (no row, no email, no log of payload)
   |-- 2 rate limit (cf-connecting-ip) -----> LEAD_LIMITER binding ----> 429-style result {kind:"rate"}
   |-- 3 zod discriminated union (by type) -> {kind:"invalid", fieldErrors}   (token NOT spent yet)
   |-- 4 verify Turnstile token ------------> POST siteverify ----------> challenges.cloudflare.com  -> {kind:"captcha"}
   |-- 5 car/ref check: stock.getById(carId); sold car -> reject
   |-- 6 duplicate? select by client_ref  --> Neon (HTTP) -> already stored? return {ok}
   |-- 7 photos: magic bytes + size, put to R2 ------------------------> LEAD_PHOTOS (EU, private)
   |-- 8 insert lead row (on conflict client_ref do nothing) ----------> Neon Postgres (EU)
   |-- 9 email dealer (text only, [DEMO] prefix, signed photo links) ---> EMAIL binding -> Cloudflare Email Service -> LEAD_TO_EMAIL
   |       failure -> caught, nothing from the error logged, row.notified_at stays null; lead still {ok}
   |-- 10 log {leadId, type, outcome} only
   v
 {ok} -> success state shown (row is stored)

 Dealer inbox -> signed link /lead-photos/<key>?exp&sig -> route handler: verify HMAC -> LEAD_PHOTOS.get -> stream (no-store, noindex)

 Saved cars (no server involvement for writes)
 Heart / header / /saved --> useSyncExternalStore --> localStorage["cartwright:saved:v1"] = ["4508173", ...]
 /saved --> GET /api/saved-cars?ids=... --> stock.getById each --> {cars, goneIds}  --> render ListingCard, prune goneIds

 Finance: FinanceCalculator (pure maths in browser) --> "Apply for finance" --> same LeadDialog (type=finance)
```

### Recommended Project Structure
```
src/
├── app/
│   ├── actions/lead.ts              # 'use server': submitLead only (async exports only)
│   ├── api/saved-cars/route.ts      # GET ?ids= -> {cars, goneIds}
│   ├── lead-photos/[...key]/route.ts# signed read of private R2 object
│   ├── sell-your-car/page.tsx
│   ├── find-a-car/page.tsx
│   ├── finance/page.tsx
│   ├── saved/page.tsx               # noindex
│   └── privacy/page.tsx             # stub (Phase 4 replaces copy)
├── components/
│   ├── leads/  LeadDialog.tsx LeadForm.tsx Field.tsx ConsentRow.tsx PhotoPicker.tsx useTurnstile.ts
│   ├── finance/FinanceCalculator.tsx
│   ├── saved/  SaveButton.tsx SavedLink.tsx SavedCars.tsx
│   └── SiteFooter.tsx
├── lib/
│   ├── leads/
│   │   ├── schema.ts      # zod union + CONSENT + LEAD_TYPES + limits (client-safe, no server imports)
│   │   ├── process.ts     # processLead(input, deps): the whole flow, framework-free
│   │   ├── deps.ts        # real deps (Neon, EMAIL, R2, limiter, Turnstile) or fake deps when E2E flag set
│   │   ├── bindings.ts    # getBindings(): getCloudflareContext().env in try/catch -> undefined fields
│   │   ├── email.ts       # buildLeadEmail(lead) pure + Mailer
│   │   ├── photos.ts      # sniff(), caps, signPhotoUrl(), verifyPhotoSig()
│   │   ├── turnstile.ts   # verifyTurnstile(token, ip)
│   │   └── log.ts         # logLead({leadId,type,outcome}) the ONLY console user, outside the no-console glob
│   ├── db/  index.ts (lazy neon+drizzle)  schema.ts
│   ├── finance/  finance.config.ts  payment.ts  (+ payment.test.ts)
│   ├── saved/  store.ts (+ store.test.ts)
│   └── env.ts             # zod-validated server env, read on use (vintage pattern)
├── test/pglite-db.ts      # vintage stand-in for '@/lib/db'
drizzle/                   # generated SQL migrations (committed)
drizzle.config.ts
scripts/check-migrations.sh  # copied from vintage
```

### Pattern 1: `processLead` with injected dependencies
**What:** one function does the whole pipeline; the server action only builds deps and calls it.
**When to use:** always; it makes integration tests (PGlite + fakes) and the E2E fake set trivial, and keeps logging in one place.
```ts
// src/lib/leads/process.ts (shape, not final code)
export type Outcome = "stored" | "invalid" | "captcha" | "rate" | "honeypot" | "error";
export type LeadResult =
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "failed"; kind: "captcha" | "rate" | "server" };

export async function processLead(fd: FormData, ctx: { ip: string }, d: Deps): Promise<LeadResult> {
  if (String(fd.get("website") ?? "") !== "") { logLead({ type: "n/a", outcome: "honeypot" }); return { status: "ok" }; }
  if (!(await d.limiter.allow(ctx.ip))) return { status: "failed", kind: "rate" };
  const parsed = leadSchema.safeParse(toObject(fd));            // discriminated union on "type"
  if (!parsed.success) return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors as never };
  if (!(await d.verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), ctx.ip))) return { status: "failed", kind: "captcha" };
  // ... car lookup, duplicate check, photos, insert, email, log. Every catch logs {leadId,type,outcome:"error"} and returns kind:"server".
}
```

### Pattern 2: Submit with `onSubmit` + `startTransition`, controlled state
**What:** the form keeps its values in React state in a component that **stays mounted while the dialog is closed**; the handler builds `FormData` and calls the action inside a transition.
**Why:** `<form action={fn}>` resets uncontrolled fields when the action finishes, "Returning a validation error instead of throwing also triggers this reset" [CITED: react.dev/reference/react-dom/components/form]. The documented escape is "Handle the submission in `onSubmit`, call `e.preventDefault()`, and run the Action inside `startTransition`". This also satisfies 03-UI-SPEC "closing never discards typed text; clear only after a successful send". Do not use `useActionState` for this form.
```tsx
const [pending, start] = useTransition();
function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const fd = buildFormData(values, photos, token, clientRef); // clientRef: crypto.randomUUID() per form instance, regenerated after success
  start(async () => setResult(await submitLead(fd)));
}
```
The FilterSheet unmounts its body after close; `LeadDialog` must **not** (keep `LeadForm` mounted, toggle only the `<dialog>`), or typed text is lost.

### Pattern 3: Lazy, memoised Neon client (no build-time connection)
```ts
// src/lib/db/index.ts [pattern: vintage src/lib/db/index.ts uses a top-level neon(); lazy is safer here]
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
let db: ReturnType<typeof make> | undefined;
const make = (url: string) => drizzle(neon(url), { schema });
export const getDb = () => (db ??= make(serverEnv().DATABASE_URL));
```
Why lazy: vintage needs placeholder `DATABASE_URL`s in CI and deploy build env because its client is created at import. A lazy getter needs none, and on Workers `process.env` secrets are only populated on the first request (`populateProcessEnv` copies every string in `env` into `process.env`) [VERIFIED: node_modules/@opennextjs/cloudflare/dist/cli/templates/init.js:82-92, `for (const [key, value] of Object.entries(env)) { if (typeof value === "string") { process.env[key] = value; } }`].

### Pattern 4: Bindings with a safe fallback
Object bindings (`EMAIL`, `LEAD_PHOTOS`, `LEAD_LIMITER`) are **not** in `process.env`; read them via `getCloudflareContext().env`. Sync `getCloudflareContext()` throws outside the Worker (`next start`, i.e. the Playwright run) [VERIFIED: node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js, sync mode throws `initOpenNextCloudflareForDevErrorMsg` when no global context]. So `bindings.ts` wraps it in try/catch and returns `{}`; `deps.ts` picks fakes **only** when `process.env.E2E_FAKE_BACKENDS === "1"` and otherwise throws a clear error if a real binding or `DATABASE_URL` is missing (a missing binding must never silently become an in-memory store in production). Mirror the existing `E2E_FAIL_QUERY` precedent (env set only by `playwright.config.ts`, with a `shortcut:` comment and the same CI note that the Worker build must not define it) [VERIFIED: src/lib/stock/index.ts, playwright.config.ts read this session].

### Pattern 5: Minimal structural types for bindings
Hand-write ~15 lines (`SendEmail`, `R2Bucket` subset, `RateLimit`) in `bindings.ts` instead of `wrangler types`/`@cloudflare/workers-types`. [ASSUMED: avoids lib clashes with the DOM types Next's tsconfig already uses.]

### Drizzle schema (recommended columns, D-03)
```ts
// src/lib/db/schema.ts
export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  clientRef: uuid("client_ref").notNull().unique(),          // idempotency for retries/double taps
  type: text().$type<LeadType>().notNull(),                  // enquiry | test_drive | reserve | trade_in | sourcing | finance
  status: text().$type<LeadStatus>().notNull().default("new"),// admin phase (#20) extends this
  carId: text("car_id"), carSlug: text("car_slug"), carTitle: text("car_title"), carPriceEur: integer("car_price_eur"), // snapshot from the PROVIDER, never from the client
  sourcePath: text("source_path").notNull(),                 // validated pathname, no query string
  name: text().notNull(), phone: text(), email: text(), message: text(),
  details: jsonb().$type<Record<string, unknown>>().notNull().default({}), // type-specific, zod-validated per branch
  photoKeys: text("photo_keys").array().notNull().default([]),   // R2 keys, never URLs
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  consentVersion: text("consent_version").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }), // null = email did not go; admin inbox can show it
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("leads_created_idx").on(t.createdAt)]);
```
Do **not** store IP, user agent or the Turnstile token (data minimisation, LED-03). `text` + `$type` (not `pgEnum`) keeps later types additive. CONTEXT D-03 lists these fields; `details`, `client_ref`, `notified_at`, `photo_keys` are research additions.

### Anti-Patterns to Avoid
- **Logging or rethrowing a Drizzle error:** message contains the bound parameters (see Pitfall 1).
- **`<form action={submitLead}>` / `useActionState`:** resets fields on validation error (Pattern 2).
- **Trusting client-sent car title/price:** send `carId` only; the action reads the car from `stock.getById` and snapshots it.
- **`after()` for the email:** OpenNext lists it as supported but an open issue reports `after()` work being cut off on Workers [CITED: github.com/opennextjs/opennextjs-cloudflare/issues/912 via search]. Await the send inline inside try/catch (adds ~100-300 ms, acceptable).
- **HTML email built from user text:** send `text` only. No HTML injection, no escaping bugs.
- **Exporting non-async values from the `'use server'` file:** only async functions may be exported; keep constants in `schema.ts`.
- **Module-level `neon()`/env reads:** needs placeholder env at build and runs before secrets are populated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bot detection | Custom puzzles, time-traps | Turnstile `siteverify` + hidden honeypot | Tokens are single-use and expire in 300 s; server verification is one `fetch` |
| Per-IP throttling | Counter table keyed by IP | Workers `ratelimits` binding | 3 lines of config, no DB write, no stored IP; "approximate" per-location limit is fine as a second layer [CITED: Workers rate-limit docs] |
| Schema validation, field errors | Manual `if` chains | zod 4 discriminated union + `z.flattenError` | Same schema runs on client and server |
| SQL migrations | Hand-written DDL | `drizzle-kit generate` + `migrate`, `scripts/check-migrations.sh` | Vintage precedent; additive-only gate protects the migrate-before-deploy window |
| Dealer-facing photo links | S3 presigning stack | HMAC (`crypto.subtle`) over `key.exp` + route handler reading the R2 binding | No credentials to store; `subtle.verify` is constant-time |
| Email transport | SMTP / MIME builder | `env.EMAIL.send({to,from,replyTo,subject,text})` | Structured API; no header injection surface |
| Image decode on the Worker | Server-side resize/validate by decoding | Client canvas re-encode + server magic-byte sniff | Worker CPU/memory; the Worker never decodes pixels |
| Cross-tab sync | Polling | `useSyncExternalStore` + `storage` event | React primitive built for external stores |
| Finance rounding | Ad-hoc `toFixed` | cents-integer maths in one tested function | See Finance section |

**Key insight:** every "security" feature here is a binding or one HTTP call; the code you own is validation, the ordering of steps, and making sure no step can echo a payload into a log.

## Detailed Findings by Focus Area

### 1. Neon + Drizzle on Workers
- **Driver:** `neon()` HTTP + `drizzle-orm/neon-http` (D-03 keeps Neon; this is vintage's choice). Neon: "Use the driver over HTTP by default... Switch to WebSockets... only if you need interactive transactions"; Workers WebSockets "can't outlive a single request" [CITED: neon.com/docs/serverless/serverless-driver]. A lead is one insert, so no transaction is needed. `sql('...', [params])` call style throws since 1.0.0; use `sql.query` or Drizzle [CITED: same page]; Drizzle handles it.
- **Region:** Neon has no Dublin. Choose **Frankfurt `aws-eu-central-1`** (EU) or London `aws-eu-west-2`; both are Postgres-only-capable, which is all that is needed [CITED: neon.com/docs/introduction/regions]. Recommend Frankfurt (inside the EU for the privacy copy). Vintage enables `placement: { mode: "smart" }` to run near its DB; skip until measured (one query per lead).
- **Migrations:** `drizzle-kit generate` committed to `drizzle/`; `drizzle-kit migrate` in `deploy.yml` **before** `opennextjs-cloudflare build`, using a `DATABASE_URL` GitHub Actions secret; add `drizzle-kit check` and `scripts/check-migrations.sh` to CI `check` [VERIFIED: vintage `.github/workflows/ci.yml` and `deploy-workers.yml`, `scripts/check-migrations.sh`, read via gh api]. The script allows only additive migrations because for a few minutes old code runs on the new schema. Every merge to `main` deploys here, so this window recurs on every merge.
- **drizzle.config.ts:** vintage loads `dotenv`; here use `try { process.loadEnvFile(".env.local") } catch {}` (Node >=24 per `.nvmrc` v24 and `engines`) and `dbCredentials.url = process.env.DATABASE_URL ?? ""`. [ASSUMED: drizzle-kit's config loader runs on Node >= 20.12 so `process.loadEnvFile` exists; verify in the first plan.]
- **Environments:** demo and production currently share one deploy. Create one Neon project; use a Neon **branch** for local/dev (`.env.local`) so dev data never mixes with demo leads.

### 2. Email from a Worker (D-01 answer)
**Verdict: Cloudflare Email Service can send to an arbitrary external recipient from a Worker.** Conditions, all [CITED: developers.cloudflare.com/email-service/, /platform/limits/, /platform/pricing/, /get-started/send-emails/]:
- Requires **Workers Paid**: "Arbitrary-recipient sending requires Workers Paid". On Free, only verified destination addresses.
- **Onboard a sending domain** (dashboard: Compute > Email Service > Email Sending > Onboard Domain). "You must be using Cloudflare DNS." Cloudflare adds MX (bounces, on a `cf-bounce` subdomain), SPF, DKIM and DMARC TXT records itself. Propagation usually 5-15 minutes. Before a domain is onboarded you can only send to verified destination addresses; after, to any recipient.
- **From address must be on the onboarded domain.** Use a notification address on a domain the owner controls (`cgaudino.com` is on Cloudflare, per the `wrangler.jsonc` comment). The dealer's own `cartwright.ie` can only be used if its DNS moves to Cloudflare, so do **not** make that a v1 dependency. Put the customer's address in `replyTo`.
- **Pricing/limits:** 3,000 emails/month included on Paid, then $0.35 per 1,000; new accounts start with "a conservative daily quota" that scales; 25 MiB message, 50 recipients, subject 998 chars. Error codes are thrown as `Error` with `.code` (`E_SENDER_NOT_VERIFIED`, `E_RECIPIENT_NOT_ALLOWED`, `E_DAILY_LIMIT_EXCEEDED`, `E_RATE_LIMIT_EXCEEDED`, ...). Return value `{ messageId }`.
- **Status:** public beta since 2026-04-16 [CITED: developers.cloudflare.com/changelog/product/email-service/ via search]. Keep the sender behind a one-function `Mailer` interface (D-01 reversible) and make the row, not the email, the record.
- **Binding config:** `"send_email": [{ "name": "EMAIL" }]`. The getting-started page shows `"remote": true` for testing against the real service. **Do not commit `remote: true`:** CI's `wrangler dev` has no Cloudflare credentials and would fail to start. Omit `remote` (default local simulator; the docs say that "with `wrangler dev` and no remote bindings" only `ArrayBuffer` attachments cannot be simulated, which implies a local simulator exists, and miniflare ships `workers/email/send_email.worker.js` [VERIFIED: node_modules/miniflare/dist/src/workers/email/send_email.worker.js exists]). Prove it in the Wave 0 spike. Real delivery is verified manually on the deployed demo.
- **Secrets/config:** `LEAD_TO_EMAIL` secret (D-02), `LEAD_FROM_EMAIL` (e.g. `leads@<owner domain>`; not secret, may live in `wrangler.jsonc` `vars` but then `--var` deploys must not wipe it; vintage notes plain `vars` live in the config file). No API key exists for the binding.
- **Email content:** `text` only. Subject = `${demo ? "[DEMO] " : ""}${typeLabel}: ${carTitle ?? "no car"}`, built from server-side values only (no user input in subject). Body lists name, phone, email, message, type fields, car (title, price, page URL from `SITE_URL`), source page, signed photo links, consent timestamp+version.

### 3. Server action vs route handler on OpenNext (Next 16.4.5)
- **Lead submit = Server Action** (D-10). Next treats it as an untrusted POST: CSRF `Origin` vs `Host` check, 1 MB default body cap, sequential client dispatch [CITED/VERIFIED: node_modules/next/dist/docs/01-app/02-guides/server-actions.md:78-85]. Same-origin on `carright.cgaudino.com` needs no `allowedOrigins`. Return a small serialisable result, never a DB record.
- **`bodySizeLimit` is nested under `experimental`** in this version: `experimental: { serverActions: { bodySizeLimit: '2mb' } }` [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md:65-74]; the limit "applies to the raw HTTP request body, including... `multipart/form-data`" overhead (+10-20 KB). Set it to cover the photo cap (see 5). It applies to **every** action; acceptable because each action validates.
- **Route handlers** for the two non-mutation endpoints: `GET /api/saved-cars` (read) and `GET /lead-photos/[...key]` (stream). They are not subject to the action body cap.
- **Deployment skew:** action IDs change on deploy (rotated at most every 14 days even when source is unchanged); an open page from the previous build gets "Failed to find Server Action" [CITED: server-actions.md:172-180]. Because every merge deploys, catch any thrown error in the client, show the existing send-failure copy and keep typed values (Pattern 2 already does).
- **Closures:** keep the action in a top-level `'use server'` file with no captured variables; then closure encryption and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` do not matter [CITED: server-actions.md:85].

### 4. Spam protection (D-05)
**Order inside the action:** honeypot, rate limit, zod validation, Turnstile verify, then work. Validate **before** `siteverify` so a typo does not burn the single-use token; on any non-success result the client calls `turnstile.reset()` for a fresh token.
- **Turnstile server verify:** `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, optional `remoteip` (send `cf-connecting-ip`), optional `idempotency_key`; response `{ success, "error-codes", hostname, action, challenge_ts, cdata }`; token valid 300 s, single use, max 2048 chars; late/replayed token gives `timeout-or-duplicate` [CITED: developers.cloudflare.com/turnstile/get-started/server-side-validation/]. Check `success === true` and `action === "lead"`. Treat a `fetch` failure as "captcha" failure (fail closed), never as success.
- **Invisible vs UI-SPEC:** a widget created as **Invisible** "never shown regardless of the appearance setting" [CITED: widget-configurations page], so it can never grow the container to show an interactive challenge, which 03-UI-SPEC requires. Create a **Managed** widget and render it with `appearance: "interaction-only"` ("Most visitors never see it, and suspected bots get the interactive challenge") and `execution: "render"`. [ASSUMED: this combination gives the zero-height-until-needed behaviour; check in the spike with the forced-interactive test key.]
- **Client:** load `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` on first form open/focus; `turnstile.render(el, { sitekey, execution: "render", appearance: "interaction-only", action: "lead", callback, "error-callback", "expired-callback" })`; `turnstile.reset(widgetId)` after each failed submit; `turnstile.remove(widgetId)` on unmount [CITED: client-side-rendering page]. Keep it in `useTurnstile.ts`.
- **Test keys** (no dashboard needed for CI/E2E) [CITED: developers.cloudflare.com/turnstile/troubleshooting/testing/]: site `1x00000000000000000000BB` (invisible, always passes), `2x00000000000000000000BB` (always fails), `3x00000000000000000000FF` (forces interactive); secret `1x0000000000000000000000000000000AA` (always passes), `2x0000000000000000000000000000000AA` (always fails), `3x0000000000000000000000000000000AA` (token already spent, returns `timeout-or-duplicate`). The site key is public and must be inlined at build as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; set the dummy in the E2E build step, the real key in `deploy.yml` `env` (public, like vintage's Clerk publishable key).
- **Rate limit (cheap on Workers, so include it):** `ratelimits` binding `LEAD_LIMITER`, `limit({ key: ip })` returns `{ success }`; period must be 10 or 60 s; per-location and "approximate" [CITED: Workers rate-limit docs]. Recommend `limit: 5, period: 60` (matches the UI-SPEC copy "Wait a minute and try again"). The binding exists in the wrangler schema [VERIFIED: config-schema.json:1585] and miniflare has a ratelimits plugin [VERIFIED: miniflare/dist/src/index.js `ratelimits`]. When the binding is missing (next start, tests) the limiter fake allows; that is a defence-in-depth layer, not the primary control.
- **CSP:** the repo has no Content-Security-Policy today [VERIFIED: grep of `src` and `next.config.ts` found no CSP]. If Phase 5 adds one, Turnstile needs `https://challenges.cloudflare.com` in `script-src` and `frame-src` [CITED: Turnstile CSP page].
- **Honeypot:** field name `website` (bot bait), wrapper off-screen, `aria-hidden`, `tabindex=-1`, `autocomplete=off` (03-UI-SPEC). Filled returns normal success, nothing stored.
- **Cloudflare Access:** the demo domain sits behind Access (STATE.md blocker). Server actions and Turnstile work for an authenticated visitor; remember that when the site goes public, Access is removed and the rate limit + Turnstile become the only gate.

### 5. Trade-in photos (D-13)
**Recommended:** photos in the lead FormData, written by the action to a private **EU-jurisdiction** R2 bucket via the binding.
- **Why binding over presign:** no S3 credentials (vintage needs `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `aws4fetch`, and its upload route needs auth + a DB rate limit), no bucket CORS, no orphan objects, one Turnstile token.
- **Binding API:** `put(key, value, { httpMetadata, customMetadata })` accepts `Blob`/`ArrayBuffer`/`ReadableStream` (stream needs known length); `get` returns `R2ObjectBody` with a `body` stream; `delete` takes an array [CITED: developers.cloudflare.com/r2/api/workers/workers-api-reference/]. Pass the `File` straight to `put`.
- **Caps (D-13 "researcher sets"):**
  - `PHOTO_MAX_MB = 15` per **picked file**, user-facing in the helper/error copy ("{PHOTO_MAX_MB} MB each"), checked on the **original** before re-encode so a normal 6-10 MB phone photo is never refused.
  - After client re-encode (2000px long edge, JPEG q 0.82, white fill for transparent PNG) typical output is a few hundred KB to ~1 MB. Server enforces `PHOTO_STORED_MAX_BYTES = 4 * 1024 * 1024` per file, `PHOTO_TOTAL_MAX_BYTES = 16 * 1024 * 1024` for the request, 12 files, and `bodySizeLimit: "18mb"`. [ASSUMED sizing: Worker memory is 128 MB on both plans [CITED: developers.cloudflare.com/workers/platform/limits/]; Next buffers and parses the multipart body, so ~3x copies of 16 MB should fit, but this MUST be exercised in the Wave 0 spike with 12 x ~1.3 MB files on `wrangler dev`.] The Cloudflare request-body limit (100 MB on Free/Pro domains) is not binding.
- **Server checks (never trust `file.type`):** sniff magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`; reject otherwise; store `contentType` from the sniff in `httpMetadata`; extension derived from the sniff. No decoding on the Worker.
- **Keys:** `trade-in/<leadId>/<n>.<ext>` with a server-generated `leadId = crypto.randomUUID()`; store the keys (not URLs) in `photo_keys`. Order: validate everything, write photos, insert row; if the insert throws, best-effort `delete(keys)` before returning `kind:"server"`. Idempotent retry: select by `client_ref` first and return ok if present.
- **Privacy bonus:** canvas re-encode drops EXIF (including GPS and device ids) before upload. Always re-encode; if re-encode fails for a file, show the per-file error rather than uploading the original. [ASSUMED: canvas `toBlob` re-encode strips EXIF in all target browsers; `createImageBitmap` supports `resizeWidth/resizeHeight` in current Chrome; Safari support to be checked by manual device test.]
- **iOS HEIC:** with `accept="image/jpeg,image/png,image/webp"` iOS Safari hands over JPEG [ASSUMED]; check on a real iPhone at phase verification.
- **Dealer links:** email lists `Photo 1..n` as `SITE_URL/lead-photos/<key>?exp=<unixSeconds>&sig=<base64url HMAC-SHA256(PHOTO_LINK_SECRET, key + "." + exp)>`. Route handler verifies with `crypto.subtle.verify` (constant time), checks `exp`, `key` startsWith `trade-in/`, then `LEAD_PHOTOS.get(key)` and streams with `Content-Type` from stored metadata, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `X-Content-Type-Options: nosniff`. 7-day expiry [ASSUMED]; the future admin inbox mints fresh links on demand. Do not log the key or signature.
- **Bucket:** create with EU jurisdiction (dashboard "Specify jurisdiction" or S3 `eu` endpoint; jurisdiction cannot change later) [CITED: R2 data-location page]; bind with `jurisdiction: "eu"`. No public access, no custom domain.
- **Retention (D-04):** the 12-month promise needs a mechanism. Photos: add an R2 lifecycle rule deleting `trade-in/` objects after 365 days (rules support prefix + age delete [CITED: R2 object-lifecycles page]; support on EU-jurisdiction buckets is not stated there, [ASSUMED], verify when creating the bucket). Rows: no job in v1; the plan must add a short runbook (`docs/lead-retention.md`) with the exact `DELETE FROM leads WHERE created_at < now() - interval '12 months'` statement the owner runs until #20 ships, and a erasure-on-request snippet that also deletes the R2 prefix.
- **UI-SPEC amendment required:** drop per-tile `Uploading` / `Failed` / `Try again` and the "Submit while uploading" state; keep local previews, the Remove button, the count/limit messages and live-region announcements; the submit button shows `Sending`. If the owner insists on per-photo progress, switch to the presign alternative (cost listed above).

### 6. Consent and GDPR handling (Ireland)
Not legal advice; the dealer owns compliance. What the implementation must do:
- **Consent record (D-06):** `consent_at` = server time at insert; `consent_version` = a constant string stored with every lead. Keep the visible wording in one `CONSENT` object `{ version, text }` and add a test that fails if `text` changes without `version` changing (compare to a frozen copy in the test).
- **Minimisation:** no IP, UA, Turnstile token or referrer stored; `source_path` is a pathname only (strip query/hash; the server validates `^/[A-Za-z0-9._~\-/]{0,200}$`). Finance collects no income/DOB/bank data (D-17). Trade-in photos re-encoded (EXIF stripped).
- **Processors to name in the `/privacy` stub:** Cloudflare (hosting, Turnstile, R2, Email Service) and Neon (database, Frankfurt). Cloudflare's Turnstile Privacy Addendum says Cloudflare acts as processor for the site's data and controller for its own bot-detection signals [CITED: cloudflare.com/turnstile-privacy-policy/ via search]; list it. Turnstile/Cloudflare may set security cookies (`__cf_bm`, `cf_clearance`, `_cfuvid`) per third-party directories [LOW, secondary source]; localStorage saved ids are user-requested functionality and carry no personal data.
- **Retention:** 12 months, stated as a placeholder for the dealer to confirm (UI-SPEC /privacy stub). Withdrawal/erasure: by phone (`DEALER_PHONE`); never expose `LEAD_TO_EMAIL`.
- **Never log payloads (D-08):** see Pitfall 1 and the logging section below. Workers Logs is on (`observability.enabled` in `wrangler.jsonc` [VERIFIED: wrangler.jsonc read]); it records `console.*` output and uncaught exceptions, so an exception that carries a payload would persist.
- **Finance advertising (FIN-02):** Irish credit advertising is regulated (Consumer Credit Act 1995 ss. 21-22 and regulations; CCPC and Central Bank oversight; the CCPC lists required items such as instalment amount, total repayable, cost of credit and APR) [CITED: ccpc.ie/business/?p=3039 and irishstatutebook.ie via search]. This is exactly why 03-CONTEXT D-16 and the UI-SPEC "dealer's required wording" exist. Also unresolved: whether the **dealer is authorised as a credit intermediary** to take finance applications; the CCPC keeps that register. [ASSUMED/unresearched to conclusion] Raise with the owner as an Open Question; the build is unaffected (the form just records an application as a lead).

### 7. Finance calculator (FIN-01, FIN-02)
Per 03-UI-SPEC: monthly rate = APR/12, `payments = term`; APR 0 divides by term. Work in **integer cents** and derive everything from the rounded monthly cent amount so the three displayed lines are consistent:
```ts
// src/lib/finance/payment.ts
export type Quote = { monthlyEur: number; borrowedEur: number; totalEur: number; interestEur: number };
export function quote(priceEur: number, depositEur: number, termMonths: number, aprPct: number): Quote | null {
  const borrowed = priceEur - depositEur;
  if (!(priceEur >= 1000 && priceEur <= 250000) || depositEur < 0 || borrowed <= 0 || !(aprPct >= 0 && aprPct <= 30) || !Number.isInteger(termMonths) || termMonths < 1) return null;
  const r = aprPct / 100 / 12;
  const P = borrowed * 100;                                           // cents
  const monthlyC = Math.round(r === 0 ? P / termMonths : (P * r) / (1 - Math.pow(1 + r, -termMonths)));
  const totalC = monthlyC * termMonths;
  return { monthlyEur: monthlyC / 100, borrowedEur: borrowed, totalEur: totalC / 100, interestEur: (totalC - P) / 100 };
}
```
Return `null` for any invalid input (the UI shows `Check the figures above.`, never `NaN`). **Test vectors** (computed this session with the same formula): 10,000 @ 6% / 36 months = 304.2194 -> 30,422 cents (the well-known 304.22); 20,000 @ 7.9% / 48 = 487.3202 -> 48,732 cents, total 23,391.36, interest 3,391.36; 12,000 @ 0% / 48 = 250.00 exactly; 15,000 @ 9.9% / 60 = 317.9681. Display with `Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`; because lines are rounded for display from consistent cents the whole-euro figures can differ by 1 from `monthly x term`; that is acceptable under "representative".
- **Open modelling note:** APR/12 treats the APR as a nominal rate. For an effective APR the monthly rate is `(1 + APR)^(1/12) - 1`, giving a slightly lower payment. 03-UI-SPEC fixes APR/12 as "the contract"; implement that, keep the formula in this single function, and ask the dealer which their HP product uses when the real terms arrive (#9). [ASSUMED]
- **Config:** `finance.config.ts` exports `{ placeholder: true, defaults: { depositEur, termMonths, aprPct, priceEur }, notice: "Representative only. ..." }` with a `PLACEHOLDER` comment. Test: `if (process.env.APP_ENV === "production") expect(config.placeholder).toBe(false)`. This bites at go-live because `deploy.yml` sets job-level `APP_ENV` and its `npm test` step inherits it [VERIFIED: deploy.yml read]; at the current `APP_ENV: demo` it passes.

### 8. Saved cars (SAV-01, SAV-02)
- **Store:** one key (recommend `cartwright:saved:v1`) holding a JSON array of id strings, newest first. `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`; **snapshot is the raw string** (primitives compare by value, so no infinite re-render), parsed in `useMemo`. `getServerSnapshot = () => "[]"` so SSR and first client render match (no hydration mismatch, no flash). Parse defensively: array of `/^\d{1,12}$/` strings, max 100, dedupe.
- **Cross-tab:** the `storage` event fires only in **other** tabs, so `write()` must also call the module's own listeners [standard behaviour of the Web Storage spec; ASSUMED from training, covered by a store unit test].
- **Unavailable storage:** wrap `getItem/setItem` in try/catch; fall back to a module-level in-memory string (UI-SPEC).
- **By-id lookup:** `/saved` is a client component (ids live in the browser) so it fetches `GET /api/saved-cars?ids=a,b,c`, which validates ids (regex, max 50), calls `stock.getById` for each and returns `{ cars, goneIds }` (`getById` has the same visibility as `getBySlug`: in stock or sold inside the period [VERIFIED: src/lib/stock/types.ts `getById(id: string): Promise<Car | null>; // ... same visibility as getBySlug`]). A sold-inside-window car returns normally (keeps its Sold badge, D-20); `null` means gone: prune and show the one-time note. Do **not** import the provider or `demo-cars.json` in a client file (bundle size, and eslint `no-restricted-imports` already forbids it for `src/app` and `src/components` [VERIFIED: eslint.config.mjs]). On fetch failure prune nothing.
- **ListingCard:** has no hooks and only client-safe imports, so rendering it from the client `SavedCars` is fine; add `SaveButton` (client) at `z-20` in the photo area per UI-SPEC. Unsave on `/saved` keeps the card until next visit (UI-SPEC), so `SavedCars` renders from a snapshot of ids taken at load, while hearts read the live store.
- **Header:** `SiteHeader` stays a server component; `SavedLink` is a client island with a fixed-width count slot.

### 9. Logging and the D-08 test and lint rule
- **Lint:** add to `eslint.config.mjs` a block for `["src/lib/leads/**", "src/components/leads/**", "src/app/actions/**"]` with `"no-console": "error"`. The only logger, `src/lib/leads/log.ts`, lives **outside** that glob (e.g. `src/lib/log.ts`) and accepts only `{ leadId?: string; type: LeadType | "n/a"; outcome: Outcome }`, so TypeScript prevents passing a payload.
- **Catching Drizzle/Neon/Email errors:** never `console.error(err)` and never rethrow `err`. Owner decision 2026-11-06: no error code is logged either; every catch logs only lead id, type and outcome (D-08). Return `kind:"server"`.
- **Test (D-08):** in Vitest, spy on `console.log/info/warn/error/debug` and `process.stdout.write`; run `processLead` with a sentinel payload (`name: "ZZ-SENTINEL-NAME"`, unique phone/email/message) through every path (ok, invalid, captcha, rate, honeypot, db throws a `DrizzleQueryError`-shaped error, mailer throws `{code:"E_DAILY_LIMIT_EXCEEDED"}`, photo write throws); assert no spy call serialises any sentinel; assert only `logLead` shaped calls occurred.

### 10. Test strategy (Vitest + Playwright)
`workflow.nyquist_validation` is `false` in `.planning/config.json` [VERIFIED: file read], so no Validation Architecture table; this is the working test plan.
- **Vitest** (`include: src/**/*.test.ts`, node env, alias `@`) [VERIFIED: vitest.config.mts read]: existing tests are pure-function, no jsdom. Keep to that: `payment.test.ts` (vectors above, APR 0, deposit >= price, range edges), `store.test.ts` (fake Storage, cross-listener notify, corrupt JSON, quota throw), `schema.test.ts` (each type, phone-or-email, honeypot ignored, max lengths), `photos.test.ts` (sniff, caps, signature round trip and tamper/expiry), `process.int.test.ts` (PGlite DB + fake mailer/bucket/limiter/turnstile: stored row has consent+car snapshot, duplicate `client_ref` returns ok once, email failure leaves `notified_at` null but result ok, honeypot stores nothing, sold car rejected, no-logging sentinel test), `consent.test.ts` (frozen text/version), `finance.config.test.ts` (production guard), `email.test.ts` (subject `[DEMO]` rule, no user input in subject, text-only).
- **PGlite stand-in:** copy vintage `src/test/pglite-db.ts` (reads `drizzle/*.sql`, splits on `--> statement-breakpoint`) and `vi.mock('@/lib/db', () => import('@/test/pglite-db'))` [VERIFIED: vintage file read via gh api]. neon-http and pglite Drizzle drivers share the insert/select API; avoid `db.batch`/transactions in lead code, or copy vintage's batch shim.
- **Playwright** (Pixel 7, `npm start` after `npm run build`, `APP_ENV=production`) [VERIFIED: playwright.config.ts, ci.yml e2e job read]: add `E2E_FAKE_BACKENDS=1` to the `webServer.env`, build with `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000BB`, run with `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`. Specs: `leads.spec.ts` (dialog opens focus on close button, type picker keeps typed text, field errors + summary focus, consent required, honeypot success, double-tap sends once, success state, close keeps text, 320px no horizontal scroll), `trade-in.spec.ts` (add photos via `setInputFiles` with generated JPEGs, 12 cap message, remove, submit success), `finance.spec.ts` (live recalculation, invalid state, apply prefill), `saved.spec.ts` (heart toggles, count, reload persists, second tab via `context.newPage()` sync, sold stays, removed pruned with note, empty state), `layout.spec.ts` update (4 buttons in the 104px action area, no wrap at 320px), no-JS test (Call now link and pages render). Real Turnstile network call from the Playwright container needs outbound access to `challenges.cloudflare.com`; if flaky, stub the script route in tests.
- **Worker CI job** (`ci.yml` worker): add `/sell-your-car`, `/find-a-car`, `/finance`, `/saved`, `/privacy` to the 200 list, `/lead-photos/trade-in/x` expecting 403 (bad signature), and keep the "no ERROR in wrangler.log" gate (the new bindings must start cleanly in `wrangler dev` without credentials). Also assert the fake-backend switch is off on the Worker build (extend the existing E2E_FAIL_QUERY pattern).
- **Manual (end-of-phase, `human_verify_mode: end-of-phase`):** one real enquiry and one 12-photo trade-in on the deployed demo with the real Cloudflare email; confirm the `[DEMO]` email arrives, links open, and a Neon row exists. Check an iPhone picking HEIC photos.

## Common Pitfalls

### Pitfall 1: `DrizzleQueryError` leaks the lead into logs and error pages
**What goes wrong:** a failed insert throws an error whose `message` is `Failed query: <sql>\nparams: <all bound values>`; Next logs unhandled action errors and Workers Logs persists them. [VERIFIED: drizzle-orm@0.45.4 `errors.js` lines 12-13 (scratch install): `super(\`Failed query: ${query}` / `params: ${params}\`);` plus `this.query = query; this.params = params;`]
**How to avoid:** wrap every DB call in try/catch; log `{leadId, type, outcome:"error"}` only; return a generic failure; never include `err.message`, `err.params` or `err.cause.detail` (Postgres `detail` echoes values, e.g. `Key (client_ref)=(...)`) in anything logged or returned.
**Warning signs:** `console.error(e)` in lead code; a test with a `DrizzleQueryError`-shaped mock that fails the sentinel assertion.

### Pitfall 2: React 19 resets the form after a failed action
**What goes wrong:** with `<form action>`/`useActionState` the user's text vanishes after a validation error. [CITED: react.dev form docs]
**How to avoid:** Pattern 2 (`onSubmit` + `startTransition` + controlled state); keep `LeadForm` mounted when the dialog closes. File inputs are uncontrolled and cannot be restored from state, so keep photos in React state as `File[]`/`Blob[]` and render the picker as a "select more" control, not as the source of truth.

### Pitfall 3: The email binding makes CI's `wrangler dev` fail
**What goes wrong:** `"remote": true` on `send_email` needs Cloudflare auth; CI has none, so the worker job cannot start.
**How to avoid:** omit `remote`; verify in the spike; real send tested manually on the demo.

### Pitfall 4: Silent in-memory fallback in production
**What goes wrong:** a missing `DATABASE_URL` or binding falls through to a fake and "succeeds" while storing nothing.
**How to avoid:** fakes only when `E2E_FAKE_BACKENDS === "1"`; otherwise throw. Add the same Worker-build assertion as `E2E_FAIL_QUERY`.

### Pitfall 5: Burning the Turnstile token on a validation error
**What goes wrong:** verifying before validating spends the single-use token; the user retries with a dead token and gets a captcha error.
**How to avoid:** order honeypot, rate limit, zod, **then** siteverify; always `turnstile.reset()` after a non-ok result; handle `expired-callback`.

### Pitfall 6: Migration window on every merge
**What goes wrong:** deploy runs migrations before the new code; a destructive migration breaks the old code still serving.
**How to avoid:** copy vintage's `scripts/check-migrations.sh` into CI; additive-only; never edit an applied migration.

### Pitfall 7: Server action 1 MB cap and Worker memory with 12 photos
**What goes wrong:** the default 1 MB cap rejects a multi-photo submit with a generic error; an unbounded body risks the 128 MB isolate.
**How to avoid:** client re-encode, hard caps (4 MB/file, 16 MB total, 12 files) enforced client and server, `experimental.serverActions.bodySizeLimit: "18mb"`, and the Wave 0 spike.

### Pitfall 8: Client bundle pulls in server code
**What goes wrong:** importing `process.ts`, `db`, or the stock provider from a client component bundles the Neon driver or `demo-cars.json`.
**How to avoid:** `import "server-only"` in `db/`, `deps.ts`, `process.ts`, `photos` signing; keep `schema.ts`/`payment.ts`/`store.ts` client-safe; the existing `no-restricted-imports` rule already blocks the provider from `src/app` and `src/components`.

### Pitfall 9: `useSyncExternalStore` snapshot that is a new object each call
**What goes wrong:** infinite re-render loop. **How to avoid:** snapshot = the raw string; parse in `useMemo`.

### Pitfall 10: Email deliverability and the sender domain
**What goes wrong:** `E_SENDER_NOT_VERIFIED` / `E_SENDER_DOMAIN_NOT_AVAILABLE` when `LEAD_FROM_EMAIL` is not on an onboarded domain; new accounts have a conservative daily quota. **How to avoid:** onboard the domain first (owner task, Wave 0), log only lead id, type and outcome `notify_failed` (no error code, owner decision 2026-11-06), keep `notified_at` for follow-up.

### Pitfall 11: Existing Phase 2 contracts the new UI touches
Heart `z-20` above the carousel `z-10` and the stretched title link; action area stays 104px with four buttons at 320px; the `ListingCard` card has `active:scale` and an `after:absolute after:inset-0` link, so the heart button must be a sibling positioned in the photo `div`, not inside the `Link` [VERIFIED: src/components/stock/ListingCard.tsx read]. The existing `body:has(dialog.sheet[open])` scroll lock already covers a `dialog.sheet` modifier [VERIFIED: globals.css:78-81].

## Code Examples

### wrangler.jsonc additions
```jsonc
// Source: Cloudflare docs cited above; wrangler 4.157.0 schema verified
"send_email": [{ "name": "EMAIL" }],                       // no "remote": CI has no credentials
"r2_buckets": [{ "binding": "LEAD_PHOTOS", "bucket_name": "cartwright-lead-photos", "jurisdiction": "eu" }],
"ratelimits": [{ "name": "LEAD_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }]
// Worker secrets (wrangler secret put, survive deploys): DATABASE_URL, TURNSTILE_SECRET_KEY, LEAD_TO_EMAIL, PHOTO_LINK_SECRET
// Plain config: LEAD_FROM_EMAIL. Build-time public: NEXT_PUBLIC_TURNSTILE_SITE_KEY (deploy.yml env)
```

### next.config.ts addition
```ts
// Source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md
experimental: { serverActions: { bodySizeLimit: "18mb" } }, // 16 MB photos + multipart overhead
```

### Turnstile verify
```ts
// Source: developers.cloudflare.com/turnstile/get-started/server-side-validation/
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: serverEnv().TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    const j = (await res.json()) as { success?: boolean; action?: string };
    return j.success === true && j.action === "lead";
  } catch { return false; } // fail closed, nothing logged
}
```

### Signed photo link (Web Crypto, constant-time verify)
```ts
// Source: Web Crypto API; pattern, not a library
const enc = new TextEncoder();
const hmacKey = (secret: string, usage: KeyUsage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
export async function signPhotoUrl(key: string, secret: string, ttlSec = 7 * 86400) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(`${key}.${exp}`)));
  return `/lead-photos/${key}?exp=${exp}&sig=${btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
// verify: decode sig to bytes, crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(`${key}.${exp}`)), reject if exp < now
```

### Client photo re-encode (strips EXIF, caps size)
```ts
// Source: standard Canvas/ImageBitmap APIs [ASSUMED browser support, verify on iPhone and Android mid-range]
export async function downscale(file: File, longEdge = 2000, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, longEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", quality));
}
```

### Saved store skeleton
```ts
// src/lib/saved/store.ts (client-safe)
const KEY = "cartwright:saved:v1";
let memory = "[]"; const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return memory; } };
const emit = () => listeners.forEach((l) => l());
export function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}
export const getSnapshot = read, getServerSnapshot = () => "[]";
export function setIds(ids: string[]) { const s = JSON.stringify(ids); memory = s; try { localStorage.setItem(KEY, s); } catch {} emit(); }
```

### Drizzle config (no dotenv)
```ts
// drizzle.config.ts; Source: pattern from vintage drizzle.config.ts minus dotenv
import { defineConfig } from "drizzle-kit";
try { process.loadEnvFile(".env.local"); } catch {}
export default defineConfig({ dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL ?? "" }, out: "./drizzle", schema: "./src/lib/db/schema.ts" });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `send_email` binding limited to verified destinations (Email Routing) | Email Service `send()` to any recipient after domain onboarding | public beta 2026-04-16 | D-01 workable; still beta |
| Zod 3 `error.flatten()` | Zod 4 `z.flattenError(error)` | zod 4 | Use the new helper [VERIFIED: ran in scratch] |
| `middleware.ts` | `proxy.ts` (already used here) | Next 16 | no change |
| S3-presigned R2 uploads | R2 Worker binding for server-side writes | n/a | Fewer secrets for Worker-originated writes |
| `sql('...', [params])` on neon() | `sql.query(...)` / tagged template / Drizzle | @neondatabase/serverless 1.0 | Use Drizzle only |

**Deprecated/outdated:** Cloudflare's own OpenNext guide now steers new Next apps to vinext [CITED via search]; irrelevant to this locked stack but worth knowing for the handover.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The owner's Cloudflare account is (or will be) on Workers Paid | Email | Without it email cannot reach the owner inbox; D-01 then needs the owner (stop-and-ask) |
| A2 | `send_email` without `remote` runs on a local simulator in `wrangler dev` and does not break CI | Email, Pitfall 3 | CI worker job fails to start; fall back to a flagged config or skip the binding in CI |
| A3 | Rate-limit binding is available on the account's plan and works under `wrangler dev` | Spam | Drop to Turnstile + honeypot only (D-05 allows) |
| A4 | Managed widget + `appearance: "interaction-only"` gives zero height until needed | Spam | UI-SPEC container behaviour needs adjusting |
| A5 | 128 MB isolate fits a 16 MB multipart body and `bodySizeLimit` is honoured on OpenNext | Photos | Lower caps or switch to presigned upload |
| A6 | R2 lifecycle rules work on EU-jurisdiction buckets | Retention | Photo retention needs a manual or cron delete |
| A7 | Canvas re-encode strips EXIF and `createImageBitmap` options work on target browsers | Photos | GPS leaves the device; add a Safari fallback or reject |
| A8 | iOS converts HEIC to JPEG for an `accept` list without HEIC | Photos | iPhone users cannot attach photos |
| A9 | APR/12 nominal rate matches the dealer's HP product | Finance | Payment figure off by cents per month; labelled representative |
| A10 | 7-day signed photo link TTL suits the dealer | Photos | Dealer opens a stale email; admin phase regenerates |
| A11 | Frankfurt is acceptable for the Neon region | Neon | Re-create project; schema unaffected |
| A12 | Dealer's authorisation to take finance applications (credit intermediary) is in order | GDPR/Finance | Regulatory exposure for the dealer, not the build |
| A13 | `process.loadEnvFile` is available in the drizzle-kit loader runtime | Neon | Re-add `dotenv` (SUS-flagged, vintage uses it) |
| A14 | Cloudflare API token used by `deploy.yml` can deploy bindings for Email/R2/ratelimit | Deploy | Deploy fails; owner widens token scopes |
| A15 | Hand-written structural binding types avoid DOM/workers-types clashes | Pattern 5 | Use `wrangler types` instead |
| A16 | `storage` events do not fire in the originating tab | Saved | Header count would not update in-tab (tests cover this) |

## Open Questions (RESOLVED)

1. **Photo transport and the 03-UI-SPEC upload states**: RESOLVED by plan, answered at a checkpoint.
   - What we know: server action cannot report progress; spec allows an overall-state fallback.
   - What's unclear: whether the owner accepts losing per-tile `Uploading/Failed/Try again`.
   - Recommendation: take the recommended path, amend the UI-SPEC, and note it in the PR; switch to presigned upload only if the owner objects.
   - Resolution: 03-01 Task 2 (blocking owner checkpoint) chooses `action-formdata` or `presigned-put` with the A5 spike result in hand; 03-01 Task 3 amends 03-UI-SPEC to match; 03-13 and 03-14 build the chosen transport (their precondition stops them if the owner chose `presigned-put`); the #12 PR (03-14) notes it.
2. **Is the Cloudflare account on Workers Paid, and which domain sends mail?**: RESOLVED by plan, answered at a checkpoint.
   - Needed: Paid plan; onboard `cgaudino.com` (or another Cloudflare-DNS domain) under Email Sending; pick `LEAD_FROM_EMAIL`.
   - Recommendation: owner does this before #11 execution; the plan lists it as a human task. If the owner declines Paid, stop and ask (D-01) rather than switching provider.
   - Resolution: 03-02 Task 1 (blocking owner checkpoint; `decline` stops the phase per D-01) and 03-02 Task 3 (owner provisions the domain and secrets); 03-05 sets `LEAD_FROM_EMAIL` from 03-02's SUMMARY; 03-10 re-checks the secrets before the #11 PR.
3. **Spike results (Wave 0)**: `send_email` local sim in CI, 12-photo body through `wrangler dev` (memory + `bodySizeLimit`), `ratelimits` locally, Turnstile Managed `interaction-only` behaviour. Each has an [ASSUMED] fallback above. RESOLVED by plan: 03-01 Task 1 runs the spike on the Worker runtime and records A2, A3, A4 and A5 with evidence in 03-01-SUMMARY; each failure has its named fallback there (A2: owner decision before the 03-05 mailer; A3: limiter allows with a shortcut comment in 03-08; A4: UI-SPEC Turnstile row rewritten in 03-01 Task 3; A5: lower caps recorded at 03-01 Task 2).
4. **Retention mechanism before #20**: R2 lifecycle (365 days) plus a documented manual SQL purge; confirm the dealer is fine with a manual process until the admin phase. RESOLVED by plan: `LEAD_RETENTION_MONTHS = 12` and `docs/lead-retention.md` (purge, erasure and unsent-lead SQL) in 03-06 Task 3; the 365-day R2 lifecycle rule in 03-13 Task 1 (A6 fallback recorded there); photo erasure and late-access steps in 03-14 Task 3; the dealer's confirmation of the period is stated on /privacy (03-10) and listed in the #11 PR notes (03-10).
5. **Finance legal wording and credit-intermediary status**: dealer input (#9). Build proceeds with the placeholder flag. RESOLVED by plan: 03-15 ships `FINANCE.placeholder = true`, the visible Placeholder figures badge, a replaceable notice string and a production guard test that fails while the flag is on; 03-16 raises the dealer's wording, the APR/12 assumption (A9) and credit-intermediary status (A12) in the #9 PR.
6. **Public contact email for deletion requests**: dealer to supply; stub uses `DEALER_PHONE` only. RESOLVED as a placeholder decision in 03-10 Task 2: /privacy gives `DEALER_PHONE` as the only deletion contact and never the private notification inbox; an email is added beside it when the dealer supplies one; listed in the #11 PR notes.
7. **`DEALER_PHONE` still unconfirmed** (`src/lib/site.ts`: "confirm with the dealer"). RESOLVED as a placeholder decision: the number published on cartwright.ie is used as it stands, with its existing comment, by Call now in the BuyBox (03-04), the send-failure alert (03-09), the Prefer to talk card (03-11) and /privacy (03-10); no plan changes it; listed for the dealer in the #11 PR notes (03-10).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests | yes | v24.22.1 [VERIFIED: node --version] | none needed (`.nvmrc` 24) |
| npm | install | yes | 11.19.1 | none needed |
| wrangler | local Worker, deploy | yes | 4.157.0 (devDependency) | none needed |
| `@opennextjs/cloudflare` | build | yes | 1.20.15 | none needed |
| `gh` CLI | read vintage, PRs | yes | authenticated (vintage read worked) | none needed |
| Neon project + `DATABASE_URL` | #11 | unknown | not provisioned in repo (no `.env.example`, no `.dev.vars`) | none; owner creates (Frankfurt) and adds GitHub secret `DATABASE_URL` + Worker secret |
| Cloudflare Workers Paid | Email Service arbitrary recipients | unknown | n/a | none per D-01 (ask owner) |
| Email Sending domain onboarded | Email | unknown | n/a | send only to verified addresses (not usable for the demo requirement) |
| Turnstile Managed widget (site key + secret) | #11 | unknown | n/a | Turnstile dummy keys for dev/CI/E2E |
| R2 bucket (EU) + lifecycle | #12 | unknown | n/a | local simulator in `wrangler dev`; fake bucket in E2E |
| `GITHUB` secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | deploy | referenced by `deploy.yml` | n/a | existing |
| Docker / Postgres locally | tests | not needed | n/a | PGlite covers integration tests |

**Missing dependencies with no fallback:** Workers Paid plan and an onboarded sending domain (owner actions; block real email only, not code).
**Missing dependencies with fallback:** Neon, Turnstile, R2 provisioning (owner tasks; code runs against fakes/dummy keys until done).

## Security Domain

`security_enforcement` is enabled (absent/true), ASVS level 1, block on high [VERIFIED: .planning/config.json read].

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (public site, no auth) | n/a; the signed photo link is a capability URL, covered under V4 |
| V3 Session Management | no | n/a |
| V4 Access Control | yes | Private R2 bucket, no public address; HMAC-signed, expiring, prefix-restricted photo route; `/saved` is browser-local |
| V5 Input Validation | yes | zod discriminated union server-side; length caps; magic-byte sniff for photos; ids regex-validated in `/api/saved-cars`; `source_path` pattern |
| V6 Cryptography | yes | `crypto.subtle` HMAC-SHA256, constant-time `verify`; never hand-roll; secret in Worker secret |
| V7 Error handling & logging | yes | No payload logging, sanitised catch, typed `logLead`, lint + sentinel test |
| V8 Data protection | yes | Minimisation, consent record, EU storage (Neon Frankfurt, R2 EU), retention constant, EXIF stripped |
| V13 API / Web service | yes | Server action CSRF Origin check (built in), rate limit binding, Turnstile, response shaped to `{status}` only |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bot spam / lead flooding | DoS, Spoofing | Turnstile (server verified, fail closed) + honeypot + `LEAD_LIMITER` |
| Email header/HTML injection via name/message | Tampering | Structured `send()` API, `text` only, no user input in subject, zod email |
| SQL injection | Tampering | Drizzle parameterised queries only |
| Personal data in logs | Information disclosure | No `console.*` in lead paths; `DrizzleQueryError` never logged; typed logger |
| Malicious file upload (polyglot, huge) | Tampering, DoS | Magic-byte sniff, per-file/total caps, stored `Content-Type` from sniff, `nosniff`, served only via signed route, never decoded on the Worker |
| Guessable/forever photo links | Information disclosure | Random UUID keys, HMAC + expiry, `no-store`, noindex |
| Client-supplied car data forged | Tampering | Server re-reads car by id; sold cars rejected |
| Replay/double submit | Repudiation, Tampering | `client_ref` unique + pre-check; disabled button; single-use Turnstile token |
| Open redirect / path abuse in `source_path` | Tampering | Pattern-validated pathname, never used in a redirect |
| CSRF on the action | Spoofing | Next Origin vs Host check [CITED: server-actions.md:82] |
| Trade-in photo contains location | Information disclosure | Client canvas re-encode strips EXIF (A7) |

## Sources

### Primary (HIGH confidence)
- `C:/Git/cartwright` files read this session: CONTEXT, UI-SPEC, REQUIREMENTS, STATE, `.claude/CLAUDE.md`, `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `vitest.config.mts`, `playwright.config.ts`, `eslint.config.mjs`, `.github/workflows/{ci,deploy}.yml`, `src/lib/site.ts`, `src/lib/stock/{types,index}.ts`, `src/proxy.ts`, `src/components/{SiteHeader,car/BuyBox,stock/ListingCard,stock/FilterSheet}.tsx`, `src/app/globals.css`, `src/app/sitemap.ts`
- `node_modules/next/dist/docs/01-app/02-guides/{server-actions,forms}.md`, `.../05-config/01-next-config-js/serverActions.md`, `.../01-getting-started/05-server-and-client-components.md`
- `node_modules/@opennextjs/cloudflare/dist/{api/cloudflare-context.js,cli/templates/init.js}`, `node_modules/wrangler/config-schema.json`, miniflare email worker presence
- Scratch install of `drizzle-orm@0.45.4` (`errors.js`) and `zod@4.6.7` (`flattenError`)
- `CristianGaudino/vintage` via `gh api`: `package.json`, `drizzle.config.ts`, `scripts/check-migrations.sh`, `src/lib/{env,r2}.ts`, `src/lib/db/{index,rateLimit}.ts`, `src/test/pglite-db.ts`, `src/app/api/upload/route.ts`, `.github/workflows/{ci,deploy-workers,e2e}.yml`, `wrangler.jsonc`, `.claude/CLAUDE.md`
- npm registry (`npm view`) and `gsd-tools query package-legitimacy check`

### Secondary (MEDIUM confidence, official docs fetched and summarised)
- developers.cloudflare.com: `/email-service/` , `/email-service/api/send-emails/workers-api/`, `/email-service/platform/limits/`, `/email-service/platform/pricing/`, `/email-service/get-started/send-emails/`, `/workers/runtime-apis/bindings/rate-limit/`, `/turnstile/get-started/server-side-validation/`, `/turnstile/get-started/client-side-rendering/` (+ `widget-configurations/`), `/turnstile/troubleshooting/testing/`, `/turnstile/reference/content-security-policy/`, `/r2/api/workers/workers-api-reference/`, `/r2/reference/data-location/`, `/r2/buckets/object-lifecycles/`, `/workers/platform/limits/`
- neon.com/docs/serverless/serverless-driver, neon.com/docs/introduction/regions
- react.dev/reference/react-dom/components/form
- blog.cloudflare.com/email-for-agents

### Tertiary (LOW confidence, search only, validate)
- Email Service public-beta date and `after()` reliability on OpenNext (search summaries: opennextjs-cloudflare#912)
- Turnstile cookie list (third-party directory), Cloudflare Turnstile Privacy Addendum summary
- Irish credit-advertising summary (ccpc.ie, irishstatutebook.ie via search; current text not read)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, matches the owner's own vintage repo and verified versions
- Email Service verdict: MEDIUM-HIGH, official docs, but public beta and local-sim behaviour unverified (A2)
- Photo path (binding, caps, HMAC route): MEDIUM, design is standard but memory/body-limit behaviour on OpenNext needs the Wave 0 spike (A5)
- Spam stack: MEDIUM-HIGH; Managed `interaction-only` behaviour to confirm (A4)
- Finance maths: HIGH (vectors computed); modelling choice flagged (A9)
- Saved cars: HIGH
- GDPR/finance regulation: LOW-MEDIUM, implementation-level only; legal text for the dealer to confirm

**Research date:** 2026-11-06
**Valid until:** 2026-11-20 for Email Service and OpenNext claims (fast-moving, public beta); 30 days for the rest

## Suggested Plan Shape (for the planner)

1. **Wave 0 (spike + owner tasks, before #11 code):** owner provisions Neon (Frankfurt), Turnstile Managed widget, EU R2 bucket + lifecycle, onboards a sending domain, confirms Workers Paid; spike on `wrangler dev` proves `send_email` (no `remote`), `ratelimits`, R2 binding, a 12 x ~1.3 MB multipart through a throwaway server action with `bodySizeLimit`, and Turnstile `interaction-only`. Record results in the plan.
2. **#11 Lead forms:** deps + `checkpoint:human-verify` for SUS packages; db schema + first migration + CI additions (`db:check`, `check-migrations.sh`, migrate step in `deploy.yml`); `schema.ts`, `processLead`, deps, email, Turnstile hook, `LeadDialog`/`LeadForm`/fields, buy box buttons (Enquire accent, Call now secondary), footer + privacy stub, eslint `no-console` scope, tests (PGlite integration, no-logging), E2E.
3. **#12 Trade-in and sourcing:** `/sell-your-car`, `/find-a-car`, `PhotoPicker`, photos path in `processLead`, signed route, empty-state links, sitemap entries; UI-SPEC amendment note.
4. **#9 Finance:** `payment.ts`, config + production-guard test, `FinanceCalculator` in car page and `/finance`, finance dialog via the same form (type `finance`).
5. **#10 Saved cars (independent, can run in parallel with 3-4):** store + tests, `SaveButton`, `SavedLink`, `/api/saved-cars`, `/saved`, card and car page placement.
6. **Phase gate:** manual real-email + HEIC/iPhone check on the deployed demo; ponytail audit per CLAUDE.md before each PR.
