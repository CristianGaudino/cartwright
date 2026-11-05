# Roadmap: Cartwright

## Overview

Rebuild cartwright.ie as a fast, modern, mobile-first used-car site that proves itself to the client as a pitch and first sale. The path follows the buyer: first a design contract and the stock they can browse, then the car pages that can be found and shared, then the actions that turn a visit into a lead (save, enquire, finance, trade in), then the content that builds trust (home, reviews, service, contact), and last a quality pass that holds the whole site to WCAG 2.2 AA and a Lighthouse 95 on mobile.

The project foundation (#1: Next.js 16, Tailwind v4, Cloudflare Workers via OpenNext, CI, deploy on merge) is already done and validated (FND-01). It is not a phase to build.

Scope source: GitHub issues #2-16 are v1. Each phase lists its issues so the phase PRs can say `Closes #n`. Issues #17-25 and #32 are Backlog (v2) and not in this roadmap.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Design and Stock Browsing** - Design contract, stock provider, and a searchable, filterable stock page with image carousels
- [ ] **Phase 2: Car Pages and Discovery** - Indexable car pages, one-tap share with rich previews, make and body-type landing pages
- [ ] **Phase 3: Leads, Finance and Saved Cars** - Enquiry, test drive, reserve, trade-in, sourcing and finance forms that reach the dealer, plus saved cars
- [ ] **Phase 4: Reviews and Core Pages** - Google reviews, home, service, contact, about, privacy and terms, one shared header and footer
- [ ] **Phase 5: Quality Pass** - WCAG 2.2 AA, Lighthouse 95+ on mobile, old-URL redirects, production robots and sitemap

## Phase Details

### Phase 1: Design and Stock Browsing

**Goal**: A buyer can find a car on their phone, fast: browse, search, filter and sort the stock in a modern look built around the locked logo.
**Depends on**: Nothing (foundation #1 is already complete)
**Requirements**: DES-01, STK-01, STK-02, STK-03, STK-04, BRW-01, BRW-02, BRW-03, BRW-04, BRW-05
**Issues**: #2 (DES-01), #3 (STK-01, STK-02), #4 (BRW-01, BRW-02, BRW-03, BRW-04), #5 (BRW-05), #16 (STK-03, STK-04)
**Order**: #2 first because it gates all UI. #3 and #16 have no UI dependency and can run alongside #2. Then #4, then #5. #16 closes on the written investigation; a CarsIreland/Carsie provider is built only if the client has access.
**Success Criteria** (what must be TRUE):
  1. A design contract (UI-SPEC.md) fixes palette, type, motion and layout around the locked logo, and the stock page visibly follows it
  2. User can open the stock page, search and filter by make, model, year range, budget, body type, fuel, transmission and mileage, see per-brand counts, and sort the results
  3. User can copy the stock page URL after filtering and sorting, open it in a new tab, and see the same results
  4. Each listing card shows several photos that swipe on a phone, load lazily and cause no layout shift while scrolling
  5. The CarsIreland/Carsie feed, auth, rate limits and terms are written up, and a second stock source can be added without changing any page

**Plans:** 1/9 plans executed

Plans:
- [x] 01-01-PLAN.md: StockProvider contract, in-memory provider with disjunctive facets, contract suite, lint guard (#3; wave 1)
- [ ] 01-02-PLAN.md: CarsIreland/Carsie investigation written up in docs/carsie-feed.md (#16; wave 1)
- [ ] 01-03-PLAN.md: Demo data from the dealer's real listings: 3-car trial with request count, owner checkpoint, full set (#3; wave 2)
- [ ] 01-04-PLAN.md: Design tokens, ink header with the logo, URL contract and formatters (#4; wave 3)
- [ ] 01-05-PLAN.md: /used-cars in the new design: browse, sort and page without reload, sticky bar, car page, CI worker checks (#4; wave 4)
- [ ] 01-06-PLAN.md: Every filter with honest counts and chips in the desktop sidebar, usable when results fail (#4; wave 6)
- [ ] 01-07-PLAN.md: Swipeable lazy photo carousel on listing cards (#5; wave 5)
- [ ] 01-08-PLAN.md: Mobile filter sheet: Filters button, native dialog, Show n cars (#4; wave 7)
- [ ] 01-09-PLAN.md: Stock page states split out of 01-05: provider failure with the E2E switch, zero matches, past-end page, first-load skeleton (#4; wave 5, before 01-06)

**UI hint**: yes

### Phase 2: Car Pages and Discovery

**Goal**: Every car has its own page that search engines can index and buyers can share, and buyers can land on a make or body-type page straight from search.
**Depends on**: Phase 1
**Requirements**: CAR-01, CAR-02, CAR-03, CAR-04, CAR-05, CAR-06, CAR-07
**Issues**: #6 (CAR-01, CAR-02, CAR-03, CAR-07), #7 (CAR-04, CAR-05), #8 (CAR-06)
**Success Criteria** (what must be TRUE):
  1. User can open a car from a card to its own URL and see a gallery and a spec table
  2. A removed car's URL returns 410 or redirects, never a broken page. A car marked sold stays visible, labelled Sold, for a set period (one setting), then returns 410 or redirects
  3. User can share a car with the native share sheet or a WhatsApp button, and the link previews with the photo, name and price in WhatsApp, iMessage and Facebook
  4. User can open /used-cars/audi, /used-cars/suv and make+model pages that each have their own title and copy, link to related pages, and show a helpful empty state when there is no stock
  5. Every car and landing page has a canonical URL, `Vehicle`/`Offer` JSON-LD and a sitemap entry

**Plans**: TBD
**UI hint**: yes

### Phase 3: Leads, Finance and Saved Cars

**Goal**: A buyer can act on a car they like: save it, enquire, book a test drive, reserve, apply for finance, or offer a trade-in, and the dealer receives it.
**Depends on**: Phase 2
**Requirements**: LED-01, LED-02, LED-03, LED-04, LED-05, LED-06, FIN-01, FIN-02, FIN-03, SAV-01, SAV-02
**Issues**: #11 (LED-01, LED-02, LED-03), #12 (LED-04, LED-05, LED-06), #9 (FIN-01, FIN-02, FIN-03), #10 (SAV-01, SAV-02)
**Order**: #11 first: it sets up the database, email delivery and the shared form pattern that #12 and #9 reuse. #10 has no dependency on the forms and can run any time after Phase 2.
**Success Criteria** (what must be TRUE):
  1. User can send an enquiry, book a test drive or reserve a car from a car page, and the dealer receives an email that names the car and the page it came from
  2. Invalid or spam submissions are rejected with clear field errors, the form asks for consent before sending, and no personal data appears in logs
  3. User can request a trade-in valuation (reg, mileage, optional photos) and request a car the dealer does not have, with the same form behaviour as the enquiry
  4. User can use a finance calculator (price, deposit, term, APR) that works, sees every figure labelled representative with the dealer's required wording or a clear placeholder label, and can submit a finance application that arrives as a lead
  5. User can save and unsave a car from cards and the detail page without signing in, see the saved count in the header, and find the cars on the saved page after closing and reopening the browser

**Plans**: TBD
**UI hint**: yes

### Phase 4: Reviews and Core Pages

**Goal**: The site presents Cartwright as a real local dealer: a home page that shows stock and reviews, the supporting pages, and one consistent header and footer.
**Depends on**: Phase 3
**Requirements**: REV-01, REV-02, REV-03, PGS-01, PGS-02, PGS-03, PGS-04
**Issues**: #13 (REV-01, REV-02, REV-03), #14 (PGS-01, PGS-02, PGS-03, PGS-04)
**Order**: #13 first so the home page (#14) can show reviews. The Places API provider (REV-03) is built as a swappable provider; it goes live when the client's Google Business place ID exists.
**Success Criteria** (what must be TRUE):
  1. User lands on a home page that shows featured stock and Google reviews
  2. Reviews carry the attribution Google requires, and come from demo fixtures that a Places API provider can replace without changing any page
  3. User can reach the service, contact (map and hours), about, privacy and terms pages from the header or footer
  4. Every page uses the same header and footer, and no link on the site points to `#`
  5. Local business JSON-LD is present on the site and validates

**Plans**: TBD
**UI hint**: yes

### Phase 5: Quality Pass

**Goal**: The finished site is accessible, fast on a mid-range phone, and ready to be indexed in production.
**Depends on**: Phase 4
**Requirements**: QLT-01, QLT-02, QLT-03, QLT-04
**Issues**: #15 (QLT-01, QLT-02, QLT-03, QLT-04)
**Success Criteria** (what must be TRUE):
  1. Every page meets WCAG 2.2 AA, and a user can go from the stock page to a sent enquiry with a keyboard alone
  2. Mobile Lighthouse scores 95 or more on the home, stock and car pages
  3. Old cartwright.ie URLs redirect to their new equivalents
  4. robots.txt and the sitemap are correct for the production domain and list every car and landing page

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design and Stock Browsing | 1/9 | In Progress | - |
| 2. Car Pages and Discovery | 0/TBD | Not started | - |
| 3. Leads, Finance and Saved Cars | 0/TBD | Not started | - |
| 4. Reviews and Core Pages | 0/TBD | Not started | - |
| 5. Quality Pass | 0/TBD | Not started | - |
