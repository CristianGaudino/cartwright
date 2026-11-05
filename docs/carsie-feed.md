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
