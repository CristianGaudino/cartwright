# Requirements: Cartwright

**Defined:** 2026-11-03
**Core Value:** A buyer can find a car on their phone, fast, and send the dealer an enquiry about it.

Each requirement notes its GitHub issue. Scope and status live in the issues; this file is the checkable breakdown.

## v1 Requirements

### Foundation

- [x] **FND-01**: The app builds, passes CI and runs on Cloudflare Workers via OpenNext, deployed on merge to `main` (#1)

### Design

- [x] **DES-01**: A design contract (UI-SPEC.md) defines palette, type, motion and layout as a modern identity around the locked logo, made with the apple-design skill (#2)

### Stock data

- [x] **STK-01**: A `StockProvider` interface returns cars, one car by id/slug, and filter facets with counts (#3)
- [x] **STK-02**: A file-backed provider serves generated demo cars, each with several images (#3)
- [x] **STK-03**: A second `StockProvider` can be added without changing pages (CarsIreland/Carsie, #16)
- [x] **STK-04**: Investigation of CarsIreland / Carsie feed, auth, rate limits and terms is written up; a provider is built only if access exists (#16)

### Stock browsing

- [x] **BRW-01**: User can search and filter stock by make, model, year range, budget, body type, fuel, transmission and mileage (#4)
- [x] **BRW-02**: User can sort stock (#4)
- [x] **BRW-03**: Filter and sort state lives in the URL, so a search can be shared (#4)
- [x] **BRW-04**: Filters show per-brand counts (#4)
- [x] **BRW-05**: Each listing card shows several images in a carousel, swipeable on mobile, lazy loaded, with no layout shift (#5)

### Car pages

- [ ] **CAR-01**: Each car has its own URL with gallery and spec table (#6)
- [ ] **CAR-02**: A removed car returns 410 or redirects. A sold car stays visible for a set period (see CAR-07), then returns 410 or redirects (#6)
- [ ] **CAR-03**: Car pages have canonical URLs, are in the sitemap, and carry `Vehicle`/`Offer` JSON-LD (#6)
- [ ] **CAR-04**: User can share a car with the native share sheet or a WhatsApp button (#7)
- [ ] **CAR-05**: Each car has a generated OG image with photo, name and price that previews correctly in WhatsApp, iMessage and Facebook (#7)
- [ ] **CAR-06**: Make, body-type and make+model landing pages exist (e.g. /used-cars/audi, /used-cars/suv) with unique metadata and copy, an empty state, internal links and sitemap entries (#8)
- [ ] **CAR-07**: When the dealer marks a car sold, it stays on the site for a set period, clearly labelled Sold, so new visitors see what stock to expect. The period is one setting, to confirm with the dealer. Sold cars cannot be enquired about, booked or reserved, stay out of the default stock list unless the buyer opts in, and keep their page until the period ends (#6)

### Saved cars

- [ ] **SAV-01**: User can save and unsave a car from cards and the detail page, with no sign-in (#10)
- [ ] **SAV-02**: The header shows a saved count and a saved page lists saved cars, kept in localStorage (#10)

### Leads and forms

- [ ] **LED-01**: User can send an enquiry, book a test drive or reserve a car; the form is validated server-side, spam-protected, stored in Neon and emailed to the dealer (#11)
- [ ] **LED-02**: Every lead records the car and the source page (#11)
- [ ] **LED-03**: Leads are collected with consent, kept minimal and never logged (#11)
- [ ] **LED-04**: User can request a trade-in valuation (reg, mileage, optional photos) (#12)
- [ ] **LED-05**: User can request a car the dealer does not have in stock (#12)
- [ ] **LED-06**: Valuation and sourcing forms reuse the shared lead form pattern (#12)

### Finance

- [ ] **FIN-01**: User can use a calculator (price, deposit, term, APR) that works (#9)
- [ ] **FIN-02**: Figures are labelled representative and carry the dealer's required wording; no invented APRs or terms (#9)
- [ ] **FIN-03**: User can submit a finance application that is saved as a lead (#9)

### Reviews

- [ ] **REV-01**: A `ReviewsProvider` interface with demo fixtures supplies Google reviews (#13)
- [ ] **REV-02**: Reviews are shown with the attribution Google requires (#13)
- [ ] **REV-03**: A Places API provider can replace the fixtures once the client's place ID exists (#13)

### Core pages

- [ ] **PGS-01**: Home page shows featured stock and reviews (#14)
- [ ] **PGS-02**: Service, contact (map and hours), about, privacy and terms pages exist (#14)
- [ ] **PGS-03**: Local business JSON-LD is on the site (#14)
- [ ] **PGS-04**: One shared header and footer, no dead `#` links (#14)

### Quality

- [ ] **QLT-01**: The site meets WCAG 2.2 AA (#15)
- [ ] **QLT-02**: Mobile Lighthouse score is 95 or more (#15)
- [ ] **QLT-03**: Old site URLs redirect to their new pages (#15)
- [ ] **QLT-04**: robots.txt and the sitemap are correct for production (#15)

## v2 Requirements

Backlog, paid enhancements. Tracked but not in the current roadmap.

- **ALR-01**: Back-in-stock and price-drop alerts (#17)
- **SOC-01**: Social links and latest-post embeds (#18)
- **NWS-01**: Newsletter signup and sending (#19)
- **ADM-01**: Clerk-protected admin area and lead inbox (#20)
- **ANA-01**: Analytics: visitors, location, sources (#21)
- **ANA-02**: Analytics: most viewed cars and stock performance (#22)
- **ANA-03**: Analytics: funnel and drop-off (#23)
- **ANA-04**: Analytics: lead conversion and attribution (#24)
- **ADM-02**: Admin extras, to scope (#25)
- **SOC-02**: Admin generates and auto-posts Instagram and Facebook posts and ads for a car, with monthly usage tracking and billing (#32)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer accounts and private pages | Public pages only; saved cars use localStorage |
| Stock database | Stock sits behind `StockProvider`; the client feed replaces the demo file |
| Copying the current site's design | Only the logo is locked |
| Release-tag deploys | Every merge to `main` deploys for now; revisit with a live client site |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 0 (foundation, done before this roadmap) | Complete |
| DES-01 | Phase 1 | Complete |
| STK-01 | Phase 1 | Complete |
| STK-02 | Phase 1 | Complete |
| STK-03 | Phase 1 | Complete |
| STK-04 | Phase 1 | Complete |
| BRW-01 | Phase 1 | Complete |
| BRW-02 | Phase 1 | Complete |
| BRW-03 | Phase 1 | Complete |
| BRW-04 | Phase 1 | Complete |
| BRW-05 | Phase 1 | Complete |
| CAR-01 | Phase 2 | Pending |
| CAR-02 | Phase 2 | Pending |
| CAR-03 | Phase 2 | Pending |
| CAR-04 | Phase 2 | Pending |
| CAR-05 | Phase 2 | Pending |
| CAR-06 | Phase 2 | Pending |
| CAR-07 | Phase 2 | Pending |
| LED-01 | Phase 3 | Pending |
| LED-02 | Phase 3 | Pending |
| LED-03 | Phase 3 | Pending |
| LED-04 | Phase 3 | Pending |
| LED-05 | Phase 3 | Pending |
| LED-06 | Phase 3 | Pending |
| FIN-01 | Phase 3 | Pending |
| FIN-02 | Phase 3 | Pending |
| FIN-03 | Phase 3 | Pending |
| SAV-01 | Phase 3 | Pending |
| SAV-02 | Phase 3 | Pending |
| REV-01 | Phase 4 | Pending |
| REV-02 | Phase 4 | Pending |
| REV-03 | Phase 4 | Pending |
| PGS-01 | Phase 4 | Pending |
| PGS-02 | Phase 4 | Pending |
| PGS-03 | Phase 4 | Pending |
| PGS-04 | Phase 4 | Pending |
| QLT-01 | Phase 5 | Pending |
| QLT-02 | Phase 5 | Pending |
| QLT-03 | Phase 5 | Pending |
| QLT-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40 (39 across Phases 1-5, plus FND-01 already complete)
- Unmapped: 0

---
*Requirements defined: 2026-11-03*
*Last updated: 2026-11-03 after roadmap creation*
