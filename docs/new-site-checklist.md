# Starting a new site from this repo

For a new client site, or the generic Checkwork demo (issue #134). The site is built so that the brand and the dealer's facts live in a few places. A test (`src/lib/clone-ready.test.ts`) fails if a page writes the brand, town or phone in by hand, so these stay the only places.

## 1. Create the repo and the board
1. On GitHub, make a new repo from this one (Use this template), not a fork. Set the template flag on the source repo once.
2. Copy the issue labels: `gh label clone CristianGaudino/cartwright --repo <owner>/<new-repo>`.
3. Copy the project (its fields, views and column setup, not the items): `gh project copy 6 --source-owner CristianGaudino --target-owner <owner> --title "<new title>"`, then link it to the new repo. Add new issues to it as they are opened.
4. Issues are not copied. Open the new site's own issues.

## 2. Brand and facts (change these files)
| What | Where |
|---|---|
| Name, domain, slug, phone, email, address, hours, social links, warranty, services, "facts confirmed" flag | `src/lib/site.ts` |
| Colours (accent, surface, text), radii | the `@theme` block in `src/app/globals.css` (the hero glow follows the accent) |
| Font | `src/app/layout.tsx` and `src/app/fonts/` |
| Logo, share image, hero and about photos | `public/brand/` (`logo.svg`, `logo.png`, `og-default.png`, `hero*.webp`, `about.webp`). `hero-sm.webp` is a car-centred crop of `hero.webp` (sharp `extract` left 960, top 100, width 900, height 700; the phone hero shows it full width above the words): re-cut it whenever the hero photo changes. The Checkwork footer credit stays. |
| Finance figures and wording | `src/lib/finance/finance.config.ts` (placeholder until the dealer supplies them) |
| Consent wording | `CONSENT` in `src/lib/leads/constants.ts`. A new brand is new wording: set a new version and add it to the frozen list in `src/lib/leads/consent.test.ts`. |
| Reviews | set `GOOGLE_PLACE_ID` and `GOOGLE_PLACES_API_KEY`, or keep the labelled demo reviews (`src/lib/reviews/`) |
| Old-site redirects | `redirects()` in `next.config.ts`, `e2e/redirects.spec.ts`, and the `/sell-your-car 308` line in `.github/workflows/ci.yml`. Delete them for a site with no old pages. |

## 3. Stock
`scripts/stock/demo-stock.mjs` built the Carright demo from the dealer's public pages. Do not use it for another business. Write a demo `src/lib/stock/demo-cars.json` and `public/stock/` photos you have the right to use, and replace `src/lib/stock/worst-cars.ts` (test text that names the old dealer). A real client uses the stock provider (`StockProvider`, issue #16).

## 4. Infrastructure names
- `wrangler.jsonc`: `name`, the self-reference service name, `routes`, the R2 bucket, the D1 database name and id (`npx wrangler d1 create <name> --jurisdiction eu`), the send-email sender in `site.ts` (`LEAD_FROM_EMAIL`).
- `package.json` `name`, `.github/workflows/ci.yml` (`site=` line), `deploy.yml`.
- Secrets and variables (names only, see `.env.example`): `LEAD_TO_EMAIL`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PHOTO_LINK_SECRET`, and optionally the two Google ones. `APP_ENV=production` only on the real site.
- A demo is never `APP_ENV=production`: it stays noindex and its emails are marked DEMO. For a showcase with no real backends, run with the fake backends the E2E suite uses (`E2E_FAKE_BACKENDS`, never set on a real client's Worker).

## 5. Words and docs
Update `README.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `docs/carsie-feed.md`, `docs/lead-retention.md` and `.planning/` so they name the new business. Then run `npm test`, `npm run build` and the E2E suite: they read the name, town and domain from `site.ts`, so they should pass without edits. `consent.test.ts` is the one that needs the new frozen wording.
