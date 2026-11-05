# CarsIreland / Carsie feed

No public documentation for a CarsIreland dealer feed or API was found.
The client must ask CarsIreland for access, using the questions at the end of this file.
No provider is built until access exists (D-09). The demo runs on a generated file instead.

Last checked: 2026-11-05. Issue: #16.

## What we know

| Fact | Source | Checked on |
|------|--------|------------|
| The cartwright.ie footer reads "Powered by CarsIreland.ie" and links to the dealer's CarsIreland page. | https://www.cartwright.ie/ | 2026-11-03 |
| The dealer's CarsIreland page loads and lists 58 cars in its page data (the dealer site showed about 57 two days earlier, so the count moves). | https://www.carsireland.ie/car-dealers/county/kerry/cartwright | 2026-11-05 |
| Listing photos are served from `c0.carsie.ie`: S3 behind CloudFront, content-hash file names, no size parameter, so each photo exists at fixed sizes (220 x 165 and 938 x 704). | https://c0.carsie.ie/ (headers and measured files), see `.planning/phases/01-design-and-stock-browsing/01-RESEARCH.md` | 2026-11-03 |
| The dealer's WordPress front end loads stock from its own `POST /wp-json/api/v2/search/cars`, sending an `X-WP-Nonce` header. This is the dealer site's private front-end API, not a CarsIreland feed. It is not a supported way to get stock. | https://www.cartwright.ie/ (site script), see `01-RESEARCH.md` | 2026-11-03 |
| The CarsIreland site is an Angular app. Its page data shows it reads from an internal REST service on `privateapi.carsireland.ie`, with paths such as `/rest/1.0/ci/dealer` and `/rest/1.0/ci/seo/car-dealers/...`. This is the site's own internal service. We did not call it and no public documentation describes it. | https://www.carsireland.ie/car-dealers/county/kerry/cartwright (page data) | 2026-11-05 |
| The CarsIreland platform developer says the site integrates "the Cars Ireland API" for near real-time vehicle and dealer data and uses Typesense for search. No endpoints, auth, limits or terms are given. | https://www.annertech.com/case-studies/delivering-industry-leading-search-experience-carsirelandie | 2026-11-03 |
| `robots.txt` on carsireland.ie blocks internal search and similar paths. It does not mention a feed or API. The dealer page path is not blocked. | https://www.carsireland.ie/robots.txt | 2026-11-05 |
| The CarsIreland home and dealer pages link to `/terms` and `/privacy`. We did not read them. | https://www.carsireland.ie/ | 2026-11-05 |
| No developer page, dealer-feed page or rate-limit statement appears on the home page, the dealer page or in the search done on the first research pass. | https://www.carsireland.ie/ and `01-RESEARCH.md` | 2026-11-05 |
| A second round of web searches was not run on 2026-11-05 because no search tool was available in that session. The earlier search result (no public CarsIreland or Carzone feed) is a secondary source and unverified. | `01-RESEARCH.md` | 2026-11-03 |

## Feed and auth

Known: CarsIreland has an API that its own site uses (Annertech case study), and the dealer's stock reaches the dealer site somehow.
Nobody outside CarsIreland has published how a dealer gets access.

Unknown: whether a dealer feed exists at all, its form (REST, XML, FTP push), and the credential (key, OAuth, IP allow-list).
Other Irish dealer feeds are often pushed as XML or JSON, but that is an assumption for CarsIreland (A6).

## Rate limits

Known: nothing is published.
The responses we saw carry no rate-limit headers.

Unknown: request limits, update latency, and whether a push feed removes the need to poll.

## Terms and images

Known: the listings and photos belong to the dealer and CarsIreland.
The demo uses the dealer's own listings and photos for the private pitch only.
They must be replaced by the client's feed or supplied images before any public launch (D-04).

Unknown: what CarsIreland's terms allow for re-displaying listings and photos on a dealer-owned site, and any image licensing.
No claim of permission is made here.

## Field mapping

Every field of `Car` in `src/lib/stock/types.ts`, in order.
"On cartwright.ie today" is what the dealer's car page shows (checked 2026-11-03). "Feed must supply" is what a real feed has to carry. Nothing here is confirmed against a CarsIreland feed, because none has been seen.

| Car field | On cartwright.ie today | Feed must supply | Notes |
|-----------|------------------------|------------------|-------|
| `id` | The number in `/car-details/?{id}={slug}`, for example 4508173. | A stable listing id, digits only. | Assumed stable when a car is relisted (A5). Ask the client. |
| `slug` | Not shown. Built by us. | Nothing. | Built as `{makeSlug}-{modelSlug}-{year}-{id}`. It is a public URL (D-08). Lookups use the trailing id, so a text change never 404s. |
| `make`, `makeSlug` | Make | Make as text. | The slug is derived from the label. |
| `model`, `modelSlug` | Model | Model as text. | The slug is derived from the label. |
| `variant` | Not shown on the dealer page. | Variant or trim, if the feed has it. | Optional. The UI already copes when it is missing. |
| `year` | Year | Registration year. | A whole number. |
| `priceEur` | Price, for example "€26,950". | Price in euro. | Stored as a whole euro number. Finance figures are not part of this. |
| `mileageKm` | Odometer, for example "141,998 Kms / 88,233 Miles". | Mileage, with its unit. | We take the Kms figure. Optional. |
| `fuel` | Fuel Type | Fuel type as text. | Mapped to the closed `Fuel` set: petrol, diesel, hybrid, plug-in-hybrid, electric, other. |
| `gearbox` | Transmission | Transmission as text. | Mapped to manual or automatic. |
| `bodyType`, `bodySlug` | Body | Body type as text. | The slug is derived from the label. Optional. |
| `photos` | Photos from `c0.carsie.ie`, originals at 938 x 704. | Photo URLs, original size, in display order. | The demo re-encodes to 900 x 675 WebP and copies them into the repo (D-11). A live provider must either do the same, or use URLs the client may show, and must set width and height. |
| Listing date (not in `Car` yet) | Not shown. | The date the car was listed. | "Newest listed" uses the id as a stand-in (A2). A real date replaces that. |
| Sold or removed state (not in `Car` yet) | Not shown. A sold car disappears. | A sold flag, or a removal event. | Needed for the 410 behaviour for sold cars in Phase 2 (CAR-02). |

## Adding a Carsie provider

Do this only once the client has access and a sample record. No page changes.

1. Create `src/lib/stock/carsie-provider.ts`. It exports a factory that returns a `StockProvider` and maps feed records to `Car`. Push filters, sort, paging and facet counts to the feed when it supports them. Otherwise do them in memory (D-05).
2. Add one `runContract("carsie", ...)` line in `src/lib/stock/contract.test.ts`, fed from recorded fixtures. CI never calls the live feed.
3. Change the one line in `src/lib/stock/index.ts` that names the provider (D-06).
4. Keep credentials in Wrangler secrets (`wrangler secret put`). Never in the repo or in logs.
5. Cache feed reads with `unstable_cache` or a per-isolate TTL. Cache Components are off on OpenNext Workers (opennextjs-cloudflare#1450).
6. Remove the demo data shortcuts listed in the README once real data is live, including the noindex on demo photos.

`src/app` and `src/components` never change. An ESLint `no-restricted-imports` rule fails the build if a page imports a concrete provider (STK-03).

## Questions for the client

Send these to the dealer, who can ask CarsIreland. No provider is built until access exists.

1. Does CarsIreland (Carsie) offer a dealer feed or API for your stock? In what form: REST API, XML, or FTP push?
2. How is access granted, and with what credential: an API key, OAuth, or an IP allow-list?
3. What are the rate limits, and how quickly do changes to a listing show up in the feed?
4. What do the terms say about showing your listings and photos on your own website? What are the image licensing terms?
5. Can you send the field list and one sample record?
6. How does the feed show that a car has been sold or removed?
7. Does a listing keep the same id when a car is relisted?
8. Is there a test or sandbox account we can use before going live?
9. Who, at the dealership or at CarsIreland, owns this integration and can approve access?
10. Do you hold the rights to the photos on `c0.carsie.ie`, or can you supply your own images for the public site?
