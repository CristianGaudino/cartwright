---
phase: 01-design-and-stock-browsing
plan: 04
subsystem: design-foundation
tags: [design-tokens, header, url-state, formatters]

requires:
  - phase: 01-01
    provides: "StockQuery, FUELS, GEARBOXES, SORT_KEYS and the label maps"
  - phase: 01-03
    provides: "sharp devDependency and the demo stock"
provides:
  - "src/app/globals.css: UI-SPEC tokens in @theme (four text sizes, two weights, palette, radii, shadow, sheet easing, focus ring)"
  - "next.config.ts: images.unoptimized"
  - "src/components/SiteHeader.tsx: ink header, locked logo reference, one Used cars link, in normal flow"
  - "src/lib/stock/query.ts: parseStockQuery, toSearchParams, stockHref, clearFilters, DEFAULT_QUERY, PAGE_SIZE"
  - "src/lib/stock/format.ts: formatPrice, formatKm, carTitle, carName, carMeta, countLabel"
affects: [01-05, 01-06, 01-07, 01-08, 01-09]

actuals:
  tokens: 14000
  tasks: 2
  commits: 3
plan_head_before: e31191a6721037d5bd67e069942d53b0e42eeecd
plan_head_after: 0dca6c4ee88bf5ad9814cc6a21469fcb1310c811

tech-stack:
  added: []
  patterns: ["Tailwind v4 @theme with --text-*: initial reset so only token sizes exist", "one URL<->query module shared by server and client"]

key-files:
  created:
    - src/components/SiteHeader.tsx
    - src/lib/stock/query.ts
    - src/lib/stock/query.test.ts
    - src/lib/stock/format.ts
    - src/lib/stock/format.test.ts
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - next.config.ts

key-decisions:
  - "The logo file was NOT added: this run was barred from contacting cartwright.ie and no local copy exists (see Blocked)"
  - "Home page heading moved from text-2xl to text-display, since the token reset removes Tailwind's default sizes"

requirements-completed: []

duration: 15min
completed: 2026-11-05
status: partial
---

# Phase 1 Plan 04: Design tokens, ink header and URL contract Summary

**UI-SPEC tokens and the ink header are on every page, and the URL contract and formatters are written test first; the locked logo PNG is still missing because it could not be fetched in this run.**

## Blocked: public/brand/logo.png

Task 1 asks for a one-off download of `https://www.cartwright.ie/app/uploads/2024/09/logo.png`. This run was told to send no network request to the dealer site, and there is no local copy (`.stock-cache` holds only listing and detail HTML and car photos, and no other repo or folder on this machine has it). A made-up file would break the "locked asset" rule, so none was added.

Effect: `SiteHeader` already points at `/brand/logo.png` (650 x 270, `alt="Cartwright"`), so until the file is added the header shows the alt text on ink. Build, typecheck, lint and the smoke spec do not need the file and pass.

To finish (needs network, so not done here):

```bash
mkdir -p public/brand && curl -fsSL -A "cartwright-demo-build/1.0" -o public/brand/logo.png https://www.cartwright.ie/app/uploads/2024/09/logo.png
node -e "require('sharp')('public/brand/logo.png').metadata().then(m=>{console.log(m.format,m.width,m.height);process.exit(m.format==='png'&&m.width===650&&m.height===270?0:1)})"
```

Then commit `public/brand/logo.png` as `feat(01-04): the locked logo`. Threat T-01-19 (asset integrity) stays open until that check passes. DES-01 and BRW-03 are not marked complete in REQUIREMENTS.md: DES-01 needs the logo, and BRW-03 needs the pages in 01-05.

## Accomplishments
- `globals.css` holds the UI-SPEC tokens. `--text-*: initial` and `--font-weight-*: initial` leave exactly four sizes (meta, body, heading, display) and two weights (normal, semibold). The logo's bright red has no token.
- `images.unoptimized: true`, so `next/image` serves files as they are (no Images binding needed on the Worker).
- `SiteHeader` is a server component on `bg-ink`, 56px high (64px from `lg`), in normal flow (no sticky or fixed), with one `Used cars` link. It is rendered above `{children}` in the root layout, and the title template is `%s | Cartwright`.
- `parseStockQuery` never throws: first value of repeats, `q` trimmed and cut to 80, slug lists whitelisted (`^[a-z0-9]+(-[a-z0-9]+)*$`, 40 chars, 20 values), integers bounded, `pageSize` fixed at 12. `toSearchParams` and `stockHref` write one canonical URL in UI-SPEC order with plain commas; a round trip test covers four full queries.
- Formatters give `€18,950`, `84,000 km`, `Audi A4 2.0 TDI S line`, `2019 Audi A4`, `2019 · 84,000 km · Diesel · Manual` and `No cars` / `1 car` / `24 cars`.

## Task Commits
1. Task 1 (tracer): `9c287c6` feat(01-04): ink header and UI-SPEC design tokens on every page
2. Task 2 RED: `c3330fc` test(01-04): pin the URL contract and formatters
3. Task 2 GREEN: `0dca6c4` feat(01-04): URL contract and formatters

## Verification (by exit code)
- `npm run typecheck`: 0. `npm run lint`: 0. `npm test`: 0 (5 files, 110 tests, 19 new). `npm run build`: 0.
- Prerendered `index.html` contains `src="/brand/logo.png"`, `alt="Cartwright"` and `<header`. `npx playwright test e2e/smoke.spec.ts`: 2 passed.
- No `text-xs|sm|lg|xl|2xl|3xl` in `src/app` or `src/components`; no em dash there; no `sticky` or `fixed` in `SiteHeader.tsx`; no `console.` in the new modules.
- The sharp logo check (Task 1 first verify) was not run: the file does not exist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Home page used a size the token reset removes**
- **Found during:** Task 1
- **Issue:** `src/app/page.tsx` used `text-2xl`, which no longer exists with `--text-*: initial`, and the plan's acceptance grep forbids it.
- **Fix:** `text-display`.
- **Files modified:** `src/app/page.tsx`
- **Commit:** 9c287c6

### Instruction conflict (not a code deviation)

The plan's logo download conflicted with the run instruction to make no request to the dealer host. The run instruction won; see Blocked above.

## Known Stubs
None. The header link to `/used-cars` points at a page that 01-05 adds in the same PR.

## Threat Flags
None.

## Self-Check: PASSED
Files exist: `src/components/SiteHeader.tsx`, `src/lib/stock/query.ts`, `src/lib/stock/format.ts` and both test files. Commits 9c287c6, c3330fc and 0dca6c4 are on `feat/phase-1-stock-browsing`. Not present by design: `public/brand/logo.png` (see Blocked).
