# Phase 2: Car Pages and Discovery - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Every car has its own indexable page with a gallery and full spec table, a sold/removed lifecycle, one-tap share with a rich preview, and make, body-type and make+model landing pages. Issues #6 (CAR-01, 02, 03, 07), #7 (CAR-04, 05), #8 (CAR-06). Enquiry, test drive, reserve, finance and saved cars are Phase 3: this phase only leaves room for them.

</domain>

<decisions>
## Implementation Decisions

The Phase 1 UI-SPEC (`01-UI-SPEC.md`) tokens, type and motion still apply. Phase 2 adds to its component table (Sold badge, share button, gallery/lightbox, "more photos" tile); the UI contract for those is written before building (CLAUDE.md), e.g. via `/gsd-ui-phase 2`.

### Sold and removed cars (CAR-02, CAR-07)
- **D-01:** `Car` gets an optional `soldAt` (ISO date). No status enum (reserved is Phase 3). The provider returns a sold car until `soldAt + SOLD_VISIBLE_DAYS`. The demo data marks a few cars sold at varied dates, including some already expired. — **Reversibility:** costly — `Car` and `StockProvider` are the contract every page and the future Carsie/uploader provider depend on.
- **D-02:** One setting: `SOLD_VISIBLE_DAYS = 30`, an exported constant in `src/lib/stock`, with a comment to confirm with the dealer. No env var, no UI. (Owner changed the proposed 14 to 30.)
- **D-03:** Past the period, the URL returns **410**. A slug the provider never had returns **404**. So the demo data keeps sold-and-expired cars (excluded from every list and facet, but `getBySlug` can tell "expired" from "unknown"). The 410 body links to the make page and to `/used-cars`. — **Reversibility:** costly — provider contract and public URL behaviour.
- **D-04:** Sold cars are hidden from the stock list by default. A new `sold=1` URL param (the "Include sold" toggle) shows them; sold cards carry a "Sold" badge. Sold cars must not alter default facet counts.
- **D-05:** A sold car page is the full page plus a Sold badge on the gallery and title, "Sold on {date}", **no price shown**, no enquiry/book/reserve actions, and a link to similar cars. Share still works.

### Routing and landing pages (CAR-06)
- **D-06:** One `/used-cars/[slug]` segment resolved at request time: make slug, then body-type slug, then car slug, else 404. Make+model is `/used-cars/{make}/{model}`. Car slugs end in a numeric id so they cannot collide with make/body slugs. — **Reversibility:** costly — public URL scheme and SEO surface.
- **D-07:** Landing copy is a **template filled with live facts** (counts, price range, models in stock) with a unique title and meta per page. No invented marketing text; per-page overrides can come later from the dealer.
- **D-08:** A known make or body type with no current stock still renders: helpful empty state, related makes that do have stock, **and recently sold cars of that make/body if any exist** (owner addition), and a plain link to `/used-cars` (the sourcing form arrives in Phase 3). These pages are noindex and left out of the sitemap.
- **D-09:** Only landing pages with at least one car in stock are indexable and in the sitemap. Landing pages link to each other (make to its models and body types, and back).

### Car page content (CAR-01)
- **D-10:** Nothing invented. The real cartwright.ie car page shows far more than `Car` holds today: odometer, engine size, fuel, transmission, body, colour, doors, owners, NCT date, seats, tax due, max speed, 0-62, a dealer-written description and a long equipment list. `Car` gains **optional** fields for these (engine, colour, doors, seats, owners, NCT, description, features, and whatever else the researcher finds worth keeping). The page renders a row or section only when the field is present, so another provider fills it later with no page change.
- **D-11 (authorisation):** The owner authorises **one scripted run**: one GET of `/car-details/` per car on www.cartwright.ie (about 57, at least 1.5 s apart, generic user agent, no retry loops, a failed request stops the run), preceded by a **3-car trial** that reports every request sent; the owner approves before the full run. Raw HTML is saved locally, parsed into the new optional fields, and the script fails loudly if the shape differs. Photos are not re-downloaded. Same rules as Phase 1 D-13. — **Reversibility:** reversible — cached locally, one run, regenerated output.
- **D-12:** Gallery: full-width scroll-snap carousel (reusing the card's native pattern, no library), a thumbnail strip on desktop, and tap opens a full-screen native `<dialog>` lightbox.
- **D-13:** On a phone, above the fold: gallery, title, price, Share, key facts. A **reserved action area** holds a `tel:` "Call Now" link only; Phase 3 adds enquiry, test drive, reserve and finance there without layout shift. The Sold banner takes this slot on sold cars. The dealer's finance calculator is Phase 3.

### Stock page card (owner addition during discussion)
- **D-14:** Every card's photo carousel ends with an extra final tile saying there are more photos on the listing page (e.g. "See all {n} photos"). Clicking it opens the car page. It is a real link, keyboard reachable, and does not break the carousel's slide semantics (its own `aria-label`; the "Photo i of n" labels stay on real photos). Touches `src/components/stock/PhotoCarousel.tsx` and `ListingCard.tsx`. Shown on all cards with 2+ photos; the planner decides for single-photo cars.

### Share, OG image and indexing (CAR-04, CAR-05, CAR-03)
- **D-15:** Share button calls `navigator.share` where supported; otherwise a WhatsApp `wa.me` link with car name, price and URL, then copy link as the last fallback. Sold cars share without a price.
- **D-16:** OG images are **pre-generated 1200x630 JPEGs per car by a script** (first photo + name + price; sold cars get a Sold overlay and no price), not `next/og` at request time (OpenNext on Workers size/WASM limits). Must preview in WhatsApp, iMessage and Facebook. — **Reversibility:** reversible — script plus output.
- **D-17:** Indexing code is fully built and tested (canonical, `Vehicle`/`Offer` JSON-LD, sitemap with cars and eligible landing pages). The robots meta follows `APP_ENV` like `robots.ts`: noindex everywhere except production. This replaces the hard-coded `noindex` shortcut in `src/app/used-cars/[slug]/page.tsx`. Sold cars inside the period stay indexable with no price in the offer.

### Claude's Discretion
- Slug resolution implementation, sitemap structure, breadcrumbs, "similar cars" selection, thumbnail/lightbox details, which extra spec fields to keep, tile design for D-14, within the UI-SPEC tokens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design and scope
- `.planning/phases/01-design-and-stock-browsing/01-UI-SPEC.md` — tokens, card, carousel, motion, copy; Phase 2 extends its component table (line ~119 defers sold/removed badges here).
- `.planning/phases/01-design-and-stock-browsing/01-CONTEXT.md` — D-05 provider contract, D-08 slug scheme, D-13 scrape rules.
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria.
- `.planning/REQUIREMENTS.md` — CAR-01..07.
- `.claude/CLAUDE.md` — project rules (Next.js 16 docs first, no em dashes, PR rules, ponytail audit).
- `.agents/skills/apple-design/SKILL.md` — design skill.

### Code and framework
- `src/lib/stock/types.ts` — `Car`, `StockProvider`, `StockQuery` (extend; keep the contract test passing).
- `src/lib/stock/contract.test.ts` — provider contract suite; sold/410 behaviour must be added here.
- `node_modules/next/dist/docs/` — read the guides for dynamic routes, `generateMetadata`, `sitemap.ts` and returning 410 before coding.
- `docs/carsie-feed.md` — feed investigation (#16). The owner found the dealer uploads stock through **uploader.ie**; the researcher should check whether that gives a feed or API (sold status, extra spec fields) and note it there.

### External
- https://www.cartwright.ie/car-details/?4508173=2021%20BMW%203%20Series — reference car page showing the full field set (D-10).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/stock/` (`file-provider.ts`, `query.ts`, `format.ts`, `index.ts`): single provider entry point; `getBySlug` and `getById` exist.
- `src/components/stock/PhotoCarousel.tsx`, `ListingCard.tsx`, `AppliedFilters.tsx`, `FilterSheet.tsx`: carousel pattern to reuse for the gallery and extend for D-14.
- `src/components/stock/BackToCars.tsx`, `SiteHeader`.
- `src/app/robots.ts`: `APP_ENV` gating pattern for D-17.

### Established Patterns
- Tailwind v4 `@theme` tokens; co-located tests; demo data generated by a script (`demo-cars.json`, `public/stock/`); `loading="eager"` for the first photo only.

### Integration Points
- `src/app/used-cars/[slug]/page.tsx` is a bare Phase 1 page with a noindex shortcut; Phase 2 replaces it.
- New: `src/app/sitemap.ts`, `/used-cars/[make]/[model]` route, OG generation script, car-details scrape script.

</code_context>

<specifics>
## Specific Ideas

- Sold cars staying visible makes the stock look busier; that is the point of CAR-07.
- The real cartwright.ie car pages are the content benchmark.

</specifics>

<deferred>
## Deferred Ideas

- Finance calculator and Apply for Finance on the car page: Phase 3 (FIN-01..03).
- Enquiry, test drive, reserve buttons: Phase 3 (LED-01).
- Hand-written landing copy for top makes: when the dealer supplies it.
- uploader.ie as a stock source or feed: investigate under #16, not built here.

</deferred>

## Amendments (2026-11-06, owner-approved during planning)

- **D-10:** the stale "tax due" row is dropped (dates mostly past). Max speed shows in mph as published.
- **D-11:** the network rescrape is replaced by an offline parse of `.stock-cache/`, which already holds all the data.
- **D-03 / CAR-02:** a slug the provider never had, including a car dropped from the feed without being sold, returns 404. Only sold cars past the window return 410.
- **D-05 / D-17:** no sold date or recency is shown anywhere, only a plain "Sold" label. The demo deploys with `APP_ENV=demo` (noindex, share bots allowed). Demo sold dates are relative to generation time.
- **D-09:** empty landing pages are excluded from the sitemap and carry no JSON-LD.

---

*Phase: 2-Car Pages and Discovery*
*Context gathered: 2026-11-06*
