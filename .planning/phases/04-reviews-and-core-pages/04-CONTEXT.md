# Phase 4: Reviews and Core Pages - Context

**Gathered:** 2026-11-07 (autonomous, owner asleep; best guesses logged to issue #47)
**Status:** Ready for planning

<domain>
## Phase Boundary
Reviews (#13, REV-01..03) and core pages (#14, PGS-01..04): a `ReviewsProvider` with demo fixtures and a swappable Places API provider, Google attribution, a real home page (featured stock + reviews), service, contact (map and hours), about and terms pages, local business JSON-LD, one shared header and footer, and no `#` links. Privacy exists already (Phase 3).
Out of scope: alerts, newsletters, social embeds, admin (Backlog).
</domain>

<decisions>
## Implementation Decisions (best guesses; owner reviews later)
- **D-01 Provider pattern:** `ReviewsProvider` mirrors `StockProvider` (src/lib/stock/index.ts, file-provider). Demo provider reads a generated/handwritten fixture JSON of clearly fictional reviews; a `PlacesReviewsProvider` is coded against the Places API (New) `places/{id}` with field mask, selected by env (`GOOGLE_PLACE_ID`, `GOOGLE_PLACES_API_KEY`); with either missing the demo provider is used and the fixtures are labelled as demo in non-production only.
- **D-02 Attribution:** show the "Google" attribution next to the rating and each review per Google's Places display rules (author name and link, profile photo only if the API supplies it, link to the Google Maps place). Fixtures carry the same shape (author, rating, text, relative time, authorUri) so no page changes when the provider swaps.
- **D-03 Reviews are cached:** the Places provider caches for a day via fetch revalidate (Cache Components are off); failures fall back to an empty list and the section hides rather than showing an error.
- **D-04 Home page:** replaces the current src/app/page.tsx. Sections: hero with search entry to /used-cars, featured stock (reuse ListingCard and the existing landing/stock helpers), reviews strip with aggregate rating, short "why buy from us", finance and trade-in/find-a-car CTAs linking to existing pages. Keep it fast: no new client JS beyond what cards already use.
- **D-05 Pages:** /service, /contact (address, phone via DEALER_PHONE, opening hours, embedded map as a plain link-out or lazy iframe, enquiry form reusing the existing lead form with a new `general` type only if cheap; otherwise a link to enquiry via phone), /about, /terms. Copy is plain and short, clearly placeholder where the dealer must supply facts (hours, address, services); no invented claims. No em dashes.
- **D-06 Header/footer:** one SiteHeader and one SiteFooter (already shared); add Service, Contact, About, Terms, Privacy, Saved cars (if present on the branch), Finance, Sell your car, Find a car. Fix any `href="#"`; add a unit/CI check that no `href="#"` exists in src.
- **D-07 JSON-LD:** `AutoDealer` (schema.org) local business JSON-LD in the root layout or home page using site constants (name, url, phone, address, hours placeholders); add aggregateRating only when reviews come from the real provider (never from fixtures). Validate with a unit test on shape.
- **D-08 Stacking:** branch feat/reviews-core-pages is stacked on feat/finance (PRs #48-#51 unmerged); the PR carries their commits until they merge.
- **D-09 Dealer facts:** address, hours, services and the Google place ID are unknown: use clearly-marked placeholders in src/lib/site.ts, listed for the owner in the PR.

## the agent's Discretion
Visual design follows 03-UI-SPEC tokens and the apple-design skill; Phase 4 gets its own 04-UI-SPEC.md.
</decisions>

<canonical_refs>
- .planning/ROADMAP.md (Phase 4), .planning/REQUIREMENTS.md (REV, PGS)
- .claude/CLAUDE.md (product rules), src/lib/stock/* (provider pattern), src/lib/site.ts
- .planning/phases/03-leads-finance-and-saved-cars/03-UI-SPEC.md (tokens, form, dialog patterns)
</canonical_refs>

<deferred>
- Real Google place ID and API key (owner provisions), real dealer copy, hours and map, aggregateRating in JSON-LD until real reviews flow.
</deferred>
