# Phase 2: Car Pages and Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-11-06
**Phase:** 2-Car Pages and Discovery
**Areas discussed:** Sold and removed cars, Landing page URLs and copy, Car page content and gallery, Share/OG image/indexing

## Sold and removed cars
- Status: optional `soldAt` date (chosen) vs status enum vs provider flag.
- Period: constant (chosen); owner changed the default from 14 to **30 days**.
- Gone URLs: 410 for expired sold, 404 for unknown (chosen) vs redirect vs 410 with links.
- List: hidden by default with an "Include sold" toggle (chosen).

## Landing page URLs and copy
- Routing: resolve at request time (chosen) vs prefixed paths.
- Copy: template with live facts (chosen).
- Empty state: renders; owner added **recently sold cars** shown if any.
- Indexing: only pages with stock (chosen).

## Car page content and gallery
- Specs: owner pasted the real car page (engine, colour, doors, owners, NCT, description, features). Optional fields, nothing invented. Re-scrape of /car-details/ authorised after a 3-car trial.
- Gallery: swipe carousel + thumbnails + lightbox (chosen).
- Layout: gallery, title, price, Share, key facts; reserved action area (chosen).
- Sold page: same page, Sold badge, **no price**.
- Finance/CTA: deferred to Phase 3, Call Now only.

## Share, OG image and indexing
- Share: navigator.share with WhatsApp fallback (chosen).
- Indexing: built, noindex unless production APP_ENV (chosen).
- OG: pre-generated 1200x630 per car (chosen).

## Mid-discussion additions from the owner
- Extra final tile on every stock-page card linking to the listing page (D-14).
- Dealer uploads stock via uploader.ie (noted for #16).

## Claude's Discretion
Slug resolution, sitemap structure, similar cars, lightbox details, extra spec fields.

## Deferred Ideas
Finance calculator, enquiry buttons (Phase 3), hand-written landing copy, uploader.ie provider.
