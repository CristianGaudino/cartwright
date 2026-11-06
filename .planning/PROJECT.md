# Cartwright

## What This Is

A rebuild of https://www.cartwright.ie/ (used car dealer, Tralee, Co. Kerry), built as a speculative pitch and first sale for the owner's web business. Public pages only: browse stock, view cars, save favourites, enquire, apply for finance, request a trade-in valuation. The audience is Irish used-car buyers, mostly on a mid-range phone.

Live demo at https://carright.cgaudino.com (Cloudflare Workers, behind Cloudflare Access: owner and client emails only). Every merge to `main` deploys. The client wants a rebrand; the site keeps the Cartwright name until that is decided.

## Core Value

A buyer can find a car on their phone, fast, and send the dealer an enquiry about it. If everything else fails, that must work.

## Business Context

- **Customer**: Cartwright (the dealer) as the prospective client; Irish used-car buyers as the site's users
- **Revenue model**: The site is the owner's pitch and first sale. Paid enhancements (alerts, newsletters, admin, analytics) are upsells.
- **Success metric**: The client says yes to the demo. On the site: leads (enquiries, test drives, finance, trade-ins) per visit.
- **Strategy notes**: GitHub issues #1-25 and the [Cartwright project](https://github.com/users/CristianGaudino/projects/6)

## Requirements

### Validated

- ✓ Project foundation: Next.js 16, Tailwind v4, Cloudflare Workers via OpenNext, CI, deploy-on-merge (#1) — existing

### Active

- [ ] Design direction: modern identity around the locked logo, as a UI-SPEC.md (#2)
- [ ] `StockProvider` interface with file-backed demo data (#3)
- [ ] Stock page with search, filters, sorting, URL-synced state (#4)
- [ ] Listing cards with multi-image carousel (#5)
- [ ] Indexable car detail pages with Vehicle structured data (#6)
- [ ] One-tap share with rich OG preview (#7)
- [ ] Make and body-type landing pages (#8)
- [ ] Finance calculator and application form (#9)
- [ ] Saved cars in localStorage and a saved page (#10)
- [ ] Lead forms: enquiry, test drive, reserve, with email delivery (#11)
- [ ] Trade-in valuation and car sourcing forms (#12)
- [ ] Google reviews behind a `ReviewsProvider` (#13)
- [ ] Core pages: home, service, contact, about, privacy, terms (#14)
- [ ] Accessibility, performance and SEO pass (#15)
- [ ] Investigate CarsIreland / Carsie API access (#16)

### Out of Scope

- Back-in-stock and price-drop alerts (#17), newsletter (#19), social embeds (#18), Clerk admin area and lead inbox (#20), analytics (#21-24), admin extras (#25) — Backlog, paid enhancements, not v1
- Private pages or accounts for customers — public pages only; saved cars live in localStorage
- A stock database — stock sits behind `StockProvider`; a CarsIreland/Carsie provider replaces the demo file once the client has API access
- Copying the current site's design — the logo is the only locked asset

## Context

- Stock: `StockProvider` interface. v1 is a generated file-backed provider; a CarsIreland/Carsie provider follows once the client has a key (#16). Reviews work the same way (`ReviewsProvider`, #13).
- Data: Neon Postgres + Drizzle only for leads (and later alert/newsletter subscriptions). Deferred until the lead forms (#11). Clerk only for the future admin area. The public site has no auth.
- The current site is "powered by CarsIreland.ie", images on a Carsie CDN, has a broken finance widget, duplicated header/footer markup and dead `#` links.
- The `vintage` repo (`C:\Git\vintage`, GitHub `CristianGaudino/vintage`) is the reference for code, design and process.
- Design skills live in `.agents/skills`, primarily `apple-design`. Write the design contract before building UI.
- Open client inputs: real finance terms and required wording (#9), Google Business place ID (#13), CarsIreland/Carsie API access (#16), real stock and images.

## Constraints

- **Tech stack**: Next.js 16 App Router, Tailwind v4, OpenNext on Cloudflare Workers — decided. Cache Components are off until OpenNext on Workers supports them (opennextjs-cloudflare#1450). Read `node_modules/next/dist/docs/` before writing Next code.
- **Performance**: Mobile first, fast on a mid-range phone. Lighthouse 95+ on mobile, WCAG 2.2 AA (#15).
- **Content**: On-screen text is plain, short and human. No em dashes on the site. If a label already says it, drop the helper text.
- **Finance**: Figures are representative only and carry the dealer's required wording. Never invent APRs or terms: use the client's, or label them as placeholders.
- **Privacy**: Leads and subscribers are personal data: collect with consent, keep it minimal, never log it.
- **Process**: Never commit on `main`; branch `<type>/<name>`. PRs open against `main`, ready for review (not draft), never merged by Claude, with `Closes #n`. Stage named files. Run the ponytail audit, then lint, typecheck, unit tests and E2E against a production build before opening a PR. GitHub Actions minutes are limited: fewer, finished commits.
- **Scope**: v1 is issues #1-16. GitHub issues are the source of scope and status; GSD phases map onto them.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No database for stock, behind `StockProvider` | Client feed arrives later; demo must not depend on it | — Pending |
| Neon + Drizzle for leads only, deferred to #11 | Nothing before the forms needs a database | — Pending |
| Saved cars in localStorage | No auth on the public site | — Pending |
| Cache Components off | OpenNext on Workers can't run them yet (opennextjs-cloudflare#1450); same as vintage | ✓ Good |
| Deploy on every merge to `main` | Demo phase, no release tags yet; revisit once there is a live client site | — Pending |
| Modern redesign, not a copy | Logo is the only locked asset | — Pending |
| GSD for planning, GitHub issues for scope | Owner's choice (2026-11-03) | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-03 after initialization*
