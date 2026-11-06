# Phase 2: Car Pages and Discovery - Research

**Researched:** 2026-11-06
**Domain:** Next.js 16.4.5 App Router on Cloudflare Workers (OpenNext 1.20.15): car detail pages, 410 handling, landing pages, sitemap, JSON-LD, share, OG images
**Confidence:** HIGH on 410/proxy, env, sitemap, JSON-LD, OG pipeline (each tested or read this session); MEDIUM on the Worker-side behaviour of the 410 proxy (code read, not run: this Windows machine cannot run the OpenNext build)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01 `Car` gets an optional `soldAt` (ISO date). No status enum. Provider returns a sold car until `soldAt + SOLD_VISIBLE_DAYS`. Demo data marks a few cars sold at varied dates, including some already expired.
- D-02 One setting: `SOLD_VISIBLE_DAYS = 30`, exported constant in `src/lib/stock`, comment to confirm with the dealer. No env var, no UI.
- D-03 Past the period the URL returns **410**. A slug the provider never had returns **404**. Demo data keeps sold-and-expired cars (excluded from every list and facet, but `getBySlug` can tell "expired" from "unknown"). The 410 body links to the make page and to `/used-cars`.
- D-04 Sold cars hidden from the stock list by default. `sold=1` URL param ("Include sold" toggle) shows them; sold cards carry a "Sold" badge. Sold cars must not alter default facet counts.
- D-05 Sold car page = full page plus Sold badge on gallery and title, "Sold on {date}", **no price**, no enquiry/book/reserve, link to similar cars. Share still works.
- D-06 One `/used-cars/[slug]` segment resolved at request time: make slug, then body-type slug, then car slug, else 404. Make+model is `/used-cars/{make}/{model}`. Car slugs end in a numeric id so they cannot collide.
- D-07 Landing copy is a template filled with live facts, unique title and meta per page. No invented marketing text.
- D-08 Known make/body with no stock still renders: empty state, related makes with stock, recently sold cars of that make/body, link to `/used-cars`. Noindex, out of the sitemap.
- D-09 Only landing pages with at least one car in stock are indexable and in the sitemap. Landing pages link to each other.
- D-10 Nothing invented. `Car` gains **optional** fields (engine, colour, doors, seats, owners, NCT, description, features, others worth keeping). Render a row/section only when present.
- D-11 Owner authorises one scripted run: one GET of `/car-details/` per car on www.cartwright.ie (about 57, at least 1.5 s apart, generic UA, no retry loops, a failed request stops the run), preceded by a 3-car trial that reports every request; owner approves before the full run. Raw HTML saved locally, parsed, script fails loudly if shape differs. Photos not re-downloaded.
- D-12 Gallery: full-width scroll-snap carousel (no library), thumbnail strip on desktop, tap opens full-screen native `<dialog>` lightbox.
- D-13 Phone above the fold: gallery, title, price, Share, key facts. Reserved action area holds a `tel:` "Call Now" link only; Sold banner takes this slot on sold cars.
- D-14 Every card carousel ends with a "See all {n} photos" tile linking to the car page (2+ photos; planner decides single-photo cars). Touches `PhotoCarousel.tsx`, `ListingCard.tsx`.
- D-15 Share: `navigator.share`, else WhatsApp `wa.me` link, then copy link. Sold cars share without a price.
- D-16 OG images are **pre-generated 1200x630 JPEGs per car by a script**, not `next/og` at request time. Sold: overlay, no price.
- D-17 Indexing fully built and tested (canonical, `Vehicle`/`Offer` JSON-LD, sitemap). Robots meta follows `APP_ENV` like `robots.ts`; replaces the hard-coded `noindex`. Sold cars inside the period stay indexable with no price in the offer.

### Claude's Discretion
Slug resolution implementation, sitemap structure, breadcrumbs, "similar cars" selection, thumbnail/lightbox details, which extra spec fields to keep, tile design for D-14, within the UI-SPEC tokens.

### Deferred Ideas (OUT OF SCOPE)
- Finance calculator and Apply for Finance (Phase 3).
- Enquiry, test drive, reserve buttons (Phase 3).
- Hand-written landing copy for top makes.
- uploader.ie as a stock source or feed: investigate under #16, not built here.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAR-01 | Car URL with gallery and spec table | Data already cached locally for every spec field (see "Car data"); gallery pattern reuses `PhotoCarousel` helpers |
| CAR-02 | Removed car 410 or redirect; sold car visible then 410 | 410 via `proxy.ts` rewrite with status (tested); provider `lookup()` contract |
| CAR-03 | Canonical, sitemap, `Vehicle`/`Offer` JSON-LD | `["Product","Car"]` shape, dynamic `sitemap.ts`, `metadataBase`, `APP_ENV` inlining pitfall |
| CAR-04 | Native share / WhatsApp | `useSyncExternalStore` hydration pattern already in `BackToCars` |
| CAR-05 | OG image previews | Script using `next/og` internals + sharp (tested, 97 KB output); robots/WhatsApp caveats |
| CAR-06 | Make, body, make+model landing pages | `[slug]` + `[slug]/[model]` routes; resolver order; provider taxonomy |
| CAR-07 | Sold period, labelled, not enquirable, not in default list | `soldAt` + `sold` query tri-state; facet-universe pitfall |
</phase_requirements>

## Summary

The hardest item is a real HTTP 410. Next 16.4.5 has no `gone()`: only `notFound()` (404), `forbidden()`, `unauthorized()`, `redirect()`. The documented escape hatch for a real status is Proxy ("check the slug in Proxy, then rewrite it to a not-found route or return a response"). **Tested this session:** a Node-runtime `proxy.ts` returning `NextResponse.rewrite(new URL("/gone", req.url), { status: 410 })` gives `HTTP/1.1 410 Gone` with the rewritten page body on `next build --webpack && next start`; an unknown slug through `notFound()` gives 404. On Workers, OpenNext's routing code carries a `rewriteStatusCode` through for middleware rewrites, and `@opennextjs/cloudflare` has bundled Node `proxy.ts` since 1.20.3 (installed: 1.20.15), but its own source says this path is "experimental ... not officially maintained". It could not be run here (OpenNext build fails on Windows with `EPERM symlink`), so the Linux CI `worker` job must prove it by curling an expired slug and expecting 410.

Three environment facts shape the plan. (1) `process.env.APP_ENV` is **not** visible to dynamic pages at request time unless inlined by `next.config.ts` `env` (tested: `undefined` without, `production` with). D-17 as written (`robots` meta from `APP_ENV` in `generateMetadata`) would silently noindex all of production on the Worker. (2) `deploy.yml` builds the demo domain with `APP_ENV: production`, so D-17 makes the dealer-data demo fully indexable and puts it in the sitemap; Phase 1 D-04 wanted it noindex. That needs an owner decision (Open Question 1). (3) The dealer's detail pages and the listing JSON are **already cached** in `.stock-cache/`, with every field D-10 asks for, so the D-11 network run is not needed: parse offline.

OG images work with zero new dependencies: `next/dist/compiled/@vercel/og/index.node.js` (satori + resvg shipped inside `next`) renders the footer band, `sharp` (already a devDependency) composites it under the photo. A real test produced a 1200x630 progressive JPEG of 97 KB.

**Primary recommendation:** Add `src/proxy.ts` (matcher `/used-cars/:slug`) that asks the provider `lookup(slug)` and rewrites gone cars to `/gone/[make]` with status 410; resolve everything else in a cached `resolveSlug()` inside `[slug]/page.tsx`; inline `APP_ENV` via `next.config.ts` `env`; do not add a `loading.tsx` under `[slug]`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 410 for gone cars | Proxy (request edge of the Worker) | Provider (`lookup`) | Status must be fixed before the body streams; only Proxy can do it |
| 404 for unknown slugs | Frontend Server (page, `notFound()` before any await/Suspense) | — | Real 404 only before streaming starts |
| Slug resolution make/body/car | Frontend Server | Provider taxonomy | Request-time, D-06 |
| Sold expiry rule | Provider (`SOLD_VISIBLE_DAYS`) | — | D-01: contract is where every consumer gets it |
| Canonical, JSON-LD, metadata | Frontend Server | — | Rendered in initial HTML for crawlers |
| Sitemap | Frontend Server (`sitemap.ts`, force-dynamic) | Provider | Must reflect expiry at request time |
| OG images | Build-time script -> CDN/Static (`public/og/`) | — | D-16; served by Workers assets |
| Gallery, lightbox, share | Browser (client components) | Server render of first photo / WhatsApp link | Progressive enhancement per UI-SPEC |
| Include-sold filter | URL -> Frontend Server query | Provider `sold` option | Same path as Phase 1 filters (BRW-03) |

## Standard Stack

No new packages. Everything is in `package.json` already (`next ^16.4.5` installed 16.4.5, `sharp ^0.35.5`, `vitest ^5.1.0`, `@playwright/test 1.64.1`, `@opennextjs/cloudflare ^1.20.15`). [VERIFIED: package.json:20-39, node_modules/next/package.json, node_modules/@opennextjs/cloudflare/package.json]

| Need | Use | Not |
|------|-----|-----|
| 410 | `src/proxy.ts` (Node runtime, default) | `middleware.ts` + `runtime: "experimental-edge"` is the fallback only (Next 16 rejects `edge`; message: "Use runtime 'experimental-edge' instead") |
| JSON-LD | Hand-built object + `<script type="application/ld+json">` with `<` escaped to `<` | `schema-dts` (not needed) |
| OG render | `next/dist/compiled/@vercel/og/index.node.js` + `sharp` | `@vercel/og` / `satori` as new deps; `next/og` at request time (D-16) |
| Gallery/lightbox/share | Native scroll-snap, `<dialog>`, `navigator.share` | Any carousel or lightbox library |

### Package Legitimacy Audit

No external packages are installed in this phase. Packages removed: none. Packages flagged: none. (A font **file** is needed for the OG script, see Pitfall 8; a package such as `@fontsource/inter` is not recommended.)

## Architecture Patterns

### System Architecture Diagram

```
Request GET /used-cars/{x}
   |
   v
src/proxy.ts  (matcher: /used-cars/:slug)
   |  slug ends -digits ? --no--> pass through
   |  yes: stock.lookup(slug)
   |        state "gone" ---> rewrite /gone/{makeSlug}, status 410 ---> app/gone/[make]/page.tsx (noindex)
   |        else pass through
   v
app/used-cars/[slug]/page.tsx   resolveSlug(slug)  (react cache(): page + generateMetadata share it)
   |-- make   ---> LandingPage(make)  (in stock: indexable | none: empty state, noindex)
   |-- body   ---> LandingPage(body)
   |-- car    ---> CarPage: gallery, buy box (price | Sold banner), specs, JSON-LD, share
   |-- none   ---> notFound()  => real 404 (no loading.tsx above it)
app/used-cars/[slug]/[model]/page.tsx -> make then model -> LandingPage(make+model) | notFound()
app/sitemap.ts (force-dynamic) -> provider -> cars + landing pages with stock
public/og/{id}.jpg  <- scripts/stock/og.mjs (offline, manual) ; referenced by generateMetadata
```

### Recommended Project Structure
```
src/proxy.ts                         # 410 only
src/app/gone/[make]/page.tsx         # 410 body (noindex); also add Disallow /gone to production robots
src/app/not-found.tsx                # 404 body (covers every notFound())
src/app/sitemap.ts
src/app/used-cars/[slug]/page.tsx    # replaces Phase 1 page
src/app/used-cars/[slug]/[model]/page.tsx
src/components/stock/...             # per UI-SPEC component list
src/lib/stock/{types,file-provider,index,query,format}.ts   # extended
src/lib/site.ts                      # SITE_URL, DEALER_PHONE, INDEXABLE
src/lib/stock/jsonld.ts              # pure builder, unit-tested
scripts/stock/og.mjs                 # OG generator
```

### Pattern 1: 410 through Proxy (tested)
```ts
// src/proxy.ts. Source: tested in scratch project on next 16.4.5; docs: 01-app/02-guides/streaming.md "When does streaming start?"
import { NextResponse, type NextRequest } from "next/server";
import { stock } from "@/lib/stock";

export async function proxy(req: NextRequest) {
  const slug = req.nextUrl.pathname.split("/")[2];
  if (!/-\d+$/.test(slug)) return; // make and body slugs never end in -digits: skip the provider call
  const hit = await stock.lookup(slug);
  if (hit?.state === "gone") return NextResponse.rewrite(new URL(`/gone/${hit.makeSlug}`, req.url), { status: 410 });
}
export const config = { matcher: "/used-cars/:slug" };
```
Result seen: `HTTP/1.1 410 Gone` plus the rewritten page's HTML. Unknown slug through the page: 404. [VERIFIED: local test, `next build --webpack` + `next start`]

### Pattern 2: Resolver shared by `generateMetadata` and the page
```ts
// react cache() so one request resolves the slug once. Order is D-06.
const resolveSlug = cache(async (slug: string) => {
  const tax = await stock.taxonomy();                       // everything ever known, including expired
  const make = tax.makes.find((m) => m.slug === slug);  if (make) return { kind: "make", make } as const;
  const body = tax.bodies.find((b) => b.slug === slug); if (body) return { kind: "body", body } as const;
  const car = await stock.getBySlug(slug);                  // live or sold in period only
  return car ? ({ kind: "car", car } as const) : null;       // null -> notFound() before any await/Suspense
});
```
Add a unit test that no `makeSlug` or `bodySlug` in the data matches `/-\d+$/` or equals another group's slug.

### Pattern 3: Provider contract additions (the costly decision, D-01/D-03)
Current contract [VERIFIED: src/lib/stock/types.ts:80-84]:
```ts
export interface StockProvider {
  query(q: StockQuery): Promise<StockResult>;
  getBySlug(slug: string): Promise<Car | null>;
  getById(id: string): Promise<Car | null>; // the stable source listing id (STK-01 "one car by id/slug")
}
```
Recommended additions (smallest set that serves D-03, D-04, D-08):
- `Car.soldAt?: string` (ISO date), plus the optional D-10 fields.
- `StockQuery.sold?: "exclude" | "include" | "only"` (default exclude; URL `sold=1` maps to include; landing "recently sold" uses `only`).
- `lookup(slug): Promise<{ state: "live"; car: Car } | { state: "gone"; make: string; makeSlug: string } | null>`; `getBySlug` becomes the live branch of it.
- `taxonomy(): Promise<{ makes; bodies; models }>` over all cars **including expired**, so `See more {Make}` on a 410 for a make with no stock still renders the empty state (D-03, D-08).
- `createFileProvider(cars, { now?: () => Date })` so tests pin the clock. Add `SOLD_VISIBLE_DAYS = 30` exported from `src/lib/stock` with the "confirm with the dealer" comment.
- Rules inside the provider: expired sold cars are in `lookup`/`taxonomy` only; with `sold` exclude, sold cars are out of results **and out of the facet option universe** (current `facet()` builds options from every car, so a make with only sold cars would show "Audi 0" [VERIFIED: src/lib/stock/file-provider.ts:45-57]); with `include`, sold sort after in-stock then by the chosen sort (stable partition).
- Extend `contract.test.ts` `runContract` with sold/expired/gone/taxonomy cases so a future Carsie provider must pass them.

### Anti-Patterns to Avoid
- **`loading.tsx` under `used-cars/[slug]`** (UI-SPEC "car page first load" skeleton): a Suspense fallback fixes status 200 before `notFound()` runs, so unknown slugs become soft 404s (noindex meta only). [CITED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md "Status codes"]. Data is in-memory, so skip it; if a skeleton is ever required, resolve and `notFound()` before the `<Suspense>`. The existing `(browse)/loading.tsx` sits in a route group and does not apply.
- `generateStaticParams` for `[slug]`: no incremental cache is configured on OpenNext (`open-next.config.ts`), and expiry is time-based. Keep it dynamic.
- Reading `process.env.APP_ENV` inside request-time code without inlining it (Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 410 status | Custom Worker wrapper sniffing HTML | `proxy.ts` rewrite with `status` | Supported, tested, OpenNext maps `rewriteStatusCode` |
| Text-in-image for OG | SVG strings through sharp | `next/dist/compiled/@vercel/og` (satori) with a font buffer | sharp SVG text depends on system fonts, differs by OS |
| Lightbox focus trap, Esc, backdrop | JS focus trap | native `<dialog>.showModal()` | Already used by `FilterSheet` |
| Carousel | Library | Native scroll-snap (Phase 1) | Locked |
| Date formatting | Manual strings | `Intl.DateTimeFormat("en-IE", { timeZone: "UTC", ... })` | UI-SPEC requires UTC so the ISO date never shifts |
| JSON-LD escaping | Ad hoc | `JSON.stringify(x).replace(/</g, "\\u003c")` (Next docs) | XSS in dealer text |

## Runtime State Inventory

Not a rename or migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: `APP_ENV` is build-time only on the Worker
**What goes wrong:** `generateMetadata` reads `process.env.APP_ENV`, which is `undefined` at request time, so every page ships `noindex` in production.
**Why:** `deploy.yml` sets `APP_ENV: production` only as a build-step env (`.github/workflows/deploy.yml:28`); `wrangler deploy` sets runtime vars only via `--var`. `robots.ts` works because it is prerendered at build. Tested: dynamic page prints `undefined` with build-time env only, `production` once `next.config.ts` has `env: { APP_ENV: process.env.APP_ENV ?? "" }`.
**How to avoid:** inline it in `next.config.ts` and read it only in `src/lib/site.ts` (`export const INDEXABLE = process.env.APP_ENV === "production"`). Unit test the metadata helper with `vi.stubEnv` (as `src/robots.test.ts` does). CI worker job (`APP_ENV: production`) should assert a car page has no `noindex` meta and the sitemap is non-empty.

### Pitfall 2: D-17 makes the demo indexable
`deploy.yml` builds the demo domain with `APP_ENV: production`, and `robots.ts` already allows crawling in that mode. Today pages are saved by the `noindex` shortcuts (Phase 1 D-04); D-17 removes the car-page shortcut. After Phase 2 the pitch demo, built from the dealer's listings and photos, would be crawlable, in the sitemap, with canonical and JSON-LD. See Open Question 1. (The `X-Robots-Tag: noindex` header on `/stock/*` photos remains [VERIFIED: public/_headers:1-3], so do not put photos in the sitemap `images` field.)

### Pitfall 3: Facebook/WhatsApp previews vs robots
Facebook's crawler is reported to honour `robots.txt`; a `Disallow: /` (non-production `robots.ts`) can break previews on any non-production host [community sources, not Meta docs: ASSUMED]. `noindex` meta does not block previews. WhatsApp reportedly drops og:images above about 300 KB [ASSUMED, community]; keep the JPEG under 200 KB (UI-SPEC target; test image was 97 KB). Both platforms cache failures: test on a fresh URL.

### Pitfall 4: `metadataBase` missing
No `metadataBase` in `src/app/layout.tsx` [VERIFIED: layout.tsx:5-9]. Relative `alternates.canonical`, `openGraph.images` and sitemap URLs need an absolute origin. Add `SITE_URL` to `src/lib/site.ts` (demo: `https://carright.cgaudino.com`, from `wrangler.jsonc` routes) and `metadataBase: new URL(SITE_URL)` in the root layout. Client domain swap at handover = one constant.

### Pitfall 5: Sitemap cached at build
`sitemap.ts` is cached unless it uses a request-time API or dynamic config [CITED: next docs sitemap.md "Good to know"]. Cars expire after 30 days without a deploy, so use `export const dynamic = "force-dynamic"`. Omit `lastModified` (no listing date exists; `new Date()` would be invented). Add `sitemap` to the production branch of `robots.ts`; `src/robots.test.ts` asserts only `.rules`, so it still passes.

### Pitfall 6: Time bombs in demo data
Sold dates are absolute; "inside the period" cars expire 30 days after their date, and CI (`deploy.yml` runs `npm test`) fails when a test asserts "N sold cars visible". Inject `now` in unit tests with fixture data. For demo data, have the generator derive `soldAt` from fixed ages relative to the build date and re-run it before each pitch, or rebase in `src/lib/stock/index.ts` only. E2E assertions on sold content should not hard-code counts. (Owner/planner choice.)

### Pitfall 7: Windows cannot build the Worker
`npx opennextjs-cloudflare build` fails here with `EPERM: operation not permitted, symlink` (reproduced twice). Worker behaviour (410 through Proxy, sitemap, `env` inlining) can only be proven in the Linux `worker` job. Extend its curl list: expired slug -> 410, unknown -> 404, make landing -> 200, `/sitemap.xml` -> 200 and contains a car URL.

### Pitfall 8: OG fonts and internal import path
`next/og` is not resolvable from a plain Node script (`ERR_MODULE_NOT_FOUND`); `import ... from "next/dist/compiled/@vercel/og/index.node.js"` works but is an internal path (A1). The bundled font is Geist **Regular** only [VERIFIED: node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf]; the UI-SPEC wants 600. Satori does not synthesise bold, so commit one SemiBold TTF (suggest Inter, OFL) under `scripts/stock/fonts/`, or accept Regular. Needs the owner's nod on the font file.

### Pitfall 9: Thumbnail `scrollIntoView`
Use `container.scrollTo({ left })` on the thumbnail strip, not `element.scrollIntoView`, which also scrolls the page vertically on every slide change.

### Pitfall 10: Lightbox scroll position
Open at the tapped index: call `showModal()` first, then `scrollTo({ left: i * clientWidth, behavior: "instant" })` (the `motion-safe:scroll-smooth` class would otherwise animate from 0). Photos inside a closed dialog stay unloaded if `loading="lazy"`; they reuse the gallery's URLs so they hit the cache.

## Car data (D-10, D-11)

**Do not run the D-11 network scrape.** `.stock-cache/` already holds, for 58 cars, the listing JSON (`list.raw.json`) and `cars/{id}/detail.html` (the demo has 57 cars). Parse offline in `demo-stock.mjs build`; fail loudly when a label is missing. [VERIFIED: ls .stock-cache/cars (58 dirs); node reads of list.raw.json and detail.html]

Listing `specs` keys (present on 58/58): `mileage, body, colour, rgbHex, year, owners, transmission, fuel, engine, nct, doors`. Verbatim sample: `"owners": "2 Owners"`, `"engine": "2L"`, `"nct": "07/2027"`, `"doors": "4"`. Top-level `highlights` (variant text, e.g. "Audi Q2 30 TDI 116HP SE"), `blurb` (description), `contactPhoneNumber`.

Detail-page `<dt class="detail-list__title ...">` labels and coverage (58 cars unless stated): Seats 58, Doors 58, Colour 58, Owners 58, Engine Size 55, Engine Power 50 (`210 BHP`), Max Speed 52 (`126 mph`), `0-62 mph` 51 (`9.9 seconds`), Tax Due Date 58 (`04/2026`), Annual Road Tax 1 (`€200`), Fuel Economy 1, NCAP 38 (empty). Keep: engine, colour, doors, seats, owners, nct, description, features, enginePowerBhp (optional, extra). 

Decisions the data forces:
- **Tax:** the source is a due **date** and the demo values are stale (`10/2022`, `04/2025`, `04/2026` are already past on 2026-11-06). **Drop the Road tax row.** This answers the UI-SPEC open item.
- **Max speed is mph** in the source, not km/h as UI-SPEC row formats say. Store `maxSpeedMph` and render `126 mph`, or drop the row; do not convert silently. 0-62 is `{n} s` as spec'd.
- **Description/features:** both live in `blurb`. 50 of 58 contain the marker `www.cartwright.ie`; the text after it is the equipment list (comma and newline separated, paren-aware split needed). The 8 without the marker are free-form: description only, no features. Before the marker, strip the dealer contact block (Eircode, phone, email, website lines; 50/58 carry it) because the site has its own contact. Existing test rejects `[–—<]|&amp;|&#` in every car string [VERIFIED: src/lib/stock/demo-cars.test.ts:51]; the blurbs have none (0 em/en dashes, 0 HTML).
- **Dealer phone for `DEALER_PHONE`:** `083-1333154` [VERIFIED: `.stock-cache/list.raw.json` `contactPhoneNumber` on all 58 cars; `tel:083-1333154` appears 22 times in cached `used-cars.html`]. Address as published: "Maglas, Ballymac, Tralee, Kerry, V92 NT93" [VERIFIED: cached used-cars.html]. Use for the `tel:` link and `AutoDealer` seller.
- Mileage: the existing `mileageKm` stays.

## JSON-LD (CAR-03, D-17)

Google's Product docs: "`Car` isn't supported automatically as a subtype of `Product`"; use both types. `price` is required on `Offer`; `SoldOut` is an accepted availability. [CITED: developers.google.com/search/docs/appearance/structured-data/product-snippet] Property names confirmed on schema.org/Vehicle: `mileageFromOdometer`, `fuelType`, `vehicleTransmission`, `bodyType`, `vehicleModelDate`, `numberOfDoors`, `vehicleSeatingCapacity`, `numberOfPreviousOwners`, `vehicleEngine`, `color`. [CITED: schema.org/Vehicle]

```ts
// src/lib/stock/jsonld.ts (pure, unit-tested; every optional field only when present)
export function carJsonLd(car: Car, base: string) {
  const url = `${base}/used-cars/${car.slug}`;
  const sold = Boolean(car.soldAt);
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Car"],
    name: `${car.year} ${carTitle(car)}`,
    url,
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    itemCondition: "https://schema.org/UsedCondition",
    image: car.photos.map((p) => base + p.src),
    ...(car.mileageKm !== undefined && { mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" } }),
    offers: {
      "@type": "Offer",
      url,
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "AutoDealer", name: "Carright", telephone: DEALER_PHONE, address: { "@type": "PostalAddress", addressLocality: "Tralee", addressRegion: "Kerry", addressCountry: "IE" } },
      ...(sold
        ? { availability: "https://schema.org/SoldOut" }                       // D-17: no price
        : { availability: "https://schema.org/InStock", price: car.priceEur, priceCurrency: "EUR" }),
    },
  };
}
```
Sold cars: an `Offer` without `price` is valid schema.org but Google may flag it as incomplete for rich results (A5); acceptable (a sold car should not get a price snippet). Verify in the Rich Results Test once deployed. Render with `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />` [CITED: node_modules/next/dist/docs/01-app/02-guides/json-ld.md]. Optional: `BreadcrumbList` on car and landing pages (cheap, matches the visible breadcrumb).

## Metadata, canonical, sitemap

```ts
// generateMetadata for a car (canonical is relative: needs metadataBase)
return {
  title: `${car.year} ${carTitle(car)} for sale`,           // no "| Carright": root template adds it
  description,
  alternates: { canonical: `/used-cars/${car.slug}` },
  robots: { index: INDEXABLE },                              // helper shared by car, landing, list pages
  openGraph: { type: "website", url: `/used-cars/${car.slug}`, title, description,
    images: [{ url: `/og/${car.id}.jpg`, width: 1200, height: 630, alt: carName(car) }] },
  twitter: { card: "summary_large_image" },
};
```
Landing pages with no stock: `robots: { index: false }`. The 410 page: `robots: { index: false }`. Next injects noindex for `notFound()` pages itself. [CITED: not-found.md line 189]

```ts
// src/app/sitemap.ts
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // cars (live + sold in period), plus make / body / make+model pages with >= 1 in-stock car, plus /used-cars. No lastModified.
}
```
List page decision (adjacent, planner): `/used-cars` with any query string should stay `noindex` (duplicates landing pages); the bare `/used-cars` may be indexed and listed.

## Share (CAR-04, D-15)

- Hydrate with the `BackToCars` pattern: `useSyncExternalStore(never, read, () => LIST)` [VERIFIED: src/components/stock/BackToCars.tsx:33]. For Share: client snapshot `typeof navigator.share === "function"`, server snapshot `false`; the server-rendered element is the `wa.me` anchor.
- `navigator.share` needs HTTPS and a user gesture; swallow `AbortError` only, treat other errors as "fall through to the menu".
- WhatsApp link: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}` with `target="_blank" rel="noopener noreferrer"`. `url` is built from `SITE_URL` + slug, never `location.href`.
- Copy: `navigator.clipboard.writeText` can reject (permissions, non-secure context); show "Could not copy the link".
- UI-SPEC copy table says button label `Share car`, its Share section says `Share`: pick one (flag to ui-checker).

## OG images (CAR-05, D-16)

Tested pipeline (scratch, this session): `ImageResponse` from `next/dist/compiled/@vercel/og/index.node.js` renders the 1200x168 footer band (name, price, logo as a data URL) -> PNG buffer; `sharp` resizes the first photo to 1200x462 `cover`, composites band at `top: 462`, outputs `jpeg({ quality: 82, progressive: true })`. Result 97,362 bytes, visually correct, logo (`public/brand/logo.png`) legible on ink. Sold variant: dim the photo with a 0.45 ink overlay via a second composite, draw the `Sold` pill in the same satori pass (use a full-canvas transparent satori layer), no price. Output `public/og/{id}.jpg`; the existing test style (`demo-cars.test.ts` walks `public/stock`) can assert one OG file per car. Script is manual like `demo-stock.mjs` (never in CI or build). Source photos are `public/stock/{id}/n-hash.webp` (webp read fine by sharp).

Scope note for #16: a live provider adds cars without a script run, so pre-generated OG images only suit the demo. Falling back to the car's first photo (900x675) for a missing OG file is acceptable. Record that in `docs/carsie-feed.md`.

## Landing pages (CAR-06)

- Routes: `[slug]/page.tsx` (make or body or car) and `[slug]/[model]/page.tsx`; `PageProps<"/used-cars/[slug]/[model]">` comes from `next typegen` (the `typecheck` script runs it). Unknown model or body-with-model -> `notFound()`.
- Data: one `stock.query({ make: [..], pageSize: 100, sort: "newest" })` and compute count, min/max price, models, years in JS; show the first 12. Scales only while stock is small (demo 57 cars); note in a `shortcut:` comment, revisit with the live provider.
- Chips: from the query facets (model, body, make); make facet `parent` exists for models [VERIFIED: types.ts:59-64]. Only entries with count > 0.
- Empty state: `taxonomy()` says known; `query({ sold: "only", make: [..] })` gives recently sold; related makes from default facets.
- Similar cars: `query` same make newest, `pageSize 4`, drop self; fill from same body type; dedupe by id; max 3.
- Add `generateMetadata` per UI-SPEC copy table; titles must not repeat the suffix.

## Stock page changes (D-04, D-14)

- `parseStockQuery`/`stockHref` (`src/lib/stock/query.ts`) gain `sold=1` only (any other value ignored, like other params); `AppliedFilters`, `StockFilters`/`FilterSheet` get the checkbox and chip; Filters badge counts it.
- `PhotoCarousel`: extend index math (`atEnd = index >= n` when the tile exists), add the tile as an extra slide, dots stay at `n`. Keep tile `<a>` in the tab order. The existing `PhotoCarousel.test.ts` pins pure helpers; extract the new end-state maths into a tested helper.
- Extract `settle`/`loaded`/`failed` (PhotoCarousel.tsx:9-20) into a shared module so `CarGallery` reuses it.

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| `middleware.ts` | `proxy.ts`, Node runtime only (`runtime` config throws) | Used for 410; OpenNext bundles Node proxy since 1.20.3 but flags it experimental |
| `edge` runtime middleware | build error "Use runtime 'experimental-edge'" | Fallback only; reached the server-bundle step in OpenNext in a test |
| `pages` custom `_error` status | App Router: `notFound()` is the only 404 path; 410 only via Proxy | |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `next/dist/compiled/@vercel/og/index.node.js` stays at that path in later Next minors | OG | Script breaks on a Next upgrade; pin or switch to `satori`+`@resvg/resvg-js` devDeps (needs legitimacy check) |
| A2 | Node `proxy.ts` with `rewrite(..., {status})` returns 410 on the deployed Worker | 410 | If not, fall back to `middleware.ts` `experimental-edge`, or 404 via `notFound()` and say so; CI curl catches it |
| A3 | Facebook's crawler obeys `Disallow: /` so previews fail on non-production hosts | Pitfall 3 | Low; test previews on the real host |
| A4 | WhatsApp drops og:images over about 300 KB | Pitfall 3 | Low; target already under 200 KB |
| A5 | Google flags a price-less `Offer` on sold cars and withholds the rich result | JSON-LD | Cosmetic; no action needed |
| A6 | Inter SemiBold TTF (OFL) is acceptable to commit under `scripts/` | Pitfall 8 | Licence/owner preference |
| A7 | Unauthenticated `uploader.ie` pages disclose no feed/API (login page only) | Open Q | We know nothing about its feed |

## Open Questions (RESOLVED)

**Owner resolutions (2026-11-06):** Q1 separate `APP_ENV=demo` (noindex, share bots allowed). Q2 sold dates relative to generation, clock injected in tests. Q3 price-less `SoldOut` Offer kept. Q4 commit Inter SemiBold TTF for OG. Q5 uploader.ie questions added to docs/carsie-feed.md by plan 02-01. No sold date or recency is shown in the UI.

1. **Should the demo domain be indexable after Phase 2?** `deploy.yml` sets `APP_ENV: production` for `carright.cgaudino.com`, so D-17 makes dealer-owned data and photos crawlable and sitemapped. Recommendation: owner decides before the Phase 2 PR merges. Cleanest option: add a distinct non-production value for the demo deploy (e.g. `APP_ENV=demo`), and let non-production `robots.ts` disallow `*` while allowing `facebookexternalhit`, `Facebot`, `Twitterbot` so share previews still work (pages stay `noindex`). Needs `robots.test.ts` updated.
2. **Demo sold dates:** relative-to-generation (re-run before pitches) or rebased in `index.ts`? (Pitfall 6.)
3. **Sold `Offer`:** keep price-less `Offer` (D-17 wording) or drop `offers` for sold cars? Recommendation: keep per D-17.
4. **OG font:** commit an Inter SemiBold TTF, or use bundled Geist Regular?
5. **uploader.ie (docs/carsie-feed.md):** `https://uploader.ie` is a login page ("Powering your dealership", username/password, a "Partner platforms" section, customer care 01-7055537); no public docs, feed or API found by search. Add to the client questions: does uploader.ie push to CarsIreland/Carzone/the dealer site, can it export or expose an API/feed, how does it mark sold, what extra spec fields exist. [VERIFIED: WebFetch https://uploader.ie] Not built here (deferred).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, tests | yes | 24.22.1 (engines `>=24 <25`) | — |
| sharp | OG script | yes | ^0.35.5 | — |
| `next build` (webpack) | local checks | yes (Turbopack build fails only in my junction scratch dir, not in the repo) | 16.4.5 | — |
| `opennextjs-cloudflare build` locally | Worker proof | no (Windows `EPERM symlink`) | 1.20.15 | Linux CI `worker` job in `ci.yml` |
| Playwright | E2E | yes | 1.64.1 (Pixel 7 profile; `npm start` server) | — |
| WSL | local Worker build | no | — | CI |

**Missing with no fallback:** none. **Blocking-for-proof:** Worker behaviour is verifiable only in CI.

## Security Domain

Config: `security_enforcement: true`, ASVS level 1.

| ASVS | Applies | Control |
|------|---------|---------|
| V2/V3 Auth, Session | no | Public site, no auth |
| V4 Access control | no | — |
| V5 Input validation | yes | Route params (`slug`, `model`) only reach lookups against provider data; reuse the `SLUG` regex style from `query.ts` before lookup; `sold` accepts `1` only |
| V6 Cryptography | no | — |
| V7 Error handling/logging | yes | Do not log slugs/queries/URLs (existing T-01-29 rule); constant messages only |
| V14 Config | yes | No secret in `env` inlining; `APP_ENV` only |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| XSS via dealer text (description, features) | Tampering | Render as text, `white-space: pre-line`; JSON-LD `<` escaped to `<`; the existing demo-data test blocks `<` and entities |
| Open redirect / header injection via proxy | Tampering | Proxy rewrite target is built from the provider's `makeSlug`, never from request input; constant `/gone/` prefix |
| `wa.me` / share text injection | Tampering | `encodeURIComponent`; URL from `SITE_URL` + slug; `rel="noopener noreferrer"` |
| Dealer PII in descriptions (phone/email) | Info disclosure | Strip the contact block at parse time (it is the dealer's own business contact, but the site shows `DEALER_PHONE` itself) |
| `/gone/[make]` reachable at 200 | Spoofing/SEO | `noindex`, `Disallow: /gone` in production robots |

## Validation Architecture

Skipped: `workflow.nyquist_validation` is `false` in `.planning/config.json`. For reference, the repo has vitest (`include: src/**/*.test.ts`, `npm test`) and Playwright (`e2e/`, `npm run e2e`). Tests for `scripts/` parsers must live under `src/` or the vitest `include` must be widened.

## Project Constraints (from .claude/CLAUDE.md)

- Next.js 16: read `node_modules/next/dist/docs/` first (done for proxy, loading, streaming, not-found, sitemap, json-ld, generate-metadata).
- No em dashes anywhere on the site; plain short human text; drop helper text a label already says.
- Never invent finance figures (Phase 3); no invented spec data (D-10).
- Cache Components stay off; Workers via OpenNext.
- Branch first, never commit on main; PR against `main`, ready for review, never merge; `Closes #n`; stage named files.
- Before a PR: ponytail audit, lint, typecheck (`npx tsc --noEmit`), unit tests, E2E against a production build; check exit codes.
- Mobile first; fast on a mid-range phone. Personal data minimal, consented, never logged.
- Provider interface is the only data seam; pages import `{ stock }` from `@/lib/stock` only (ESLint `no-restricted-imports` on `*-provider` and `demo-cars*`).

## Sources

### Primary (HIGH)
- Local tests this session: Node proxy 410 rewrite on `next start` (410 / 404 results); `env` inlining probe; `next/og` + sharp OG render.
- `node_modules/next/dist/docs/01-app/...`: `03-file-conventions/proxy.md`, `loading.md`, `not-found.md`, `01-metadata/sitemap.md`, `02-guides/streaming.md`, `02-guides/json-ld.md`, `04-functions/generate-metadata.md`.
- `node_modules/@opennextjs/aws/dist/core/routing/middleware.js` (`rewriteStatusCode`), `@opennextjs/cloudflare/dist/cli/build/open-next/bundle-node-middleware.js` (experimental notice), `cli/templates/worker.js`.
- Repo files read: `types.ts`, `file-provider.ts`, `index.ts`, `robots.ts`, `layout.tsx`, `BackToCars.tsx`, `PhotoCarousel.tsx`, `ListingCard.tsx`, `.github/workflows/{ci,deploy}.yml`, `public/_headers`, `docs/carsie-feed.md`, `.stock-cache/*`.

### Secondary (MEDIUM)
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet (Car/Product, Offer price, SoldOut)
- https://schema.org/Vehicle (property names)
- https://github.com/opennextjs/opennextjs-cloudflare/releases/tag/@opennextjs%2Fcloudflare@1.20.3 (Node `proxy.ts` support)
- https://uploader.ie (login page only)

### Tertiary (LOW)
- Community reports on Facebook crawler and robots.txt, WhatsApp 300 KB image limit (via WebSearch): https://community.shopify.com/t/image-missing-for-product-and-collection-links-shared-on-social-media-dawn-v11/291114

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new packages.
- 410 mechanism: HIGH locally, MEDIUM on Workers until the CI curl passes.
- Architecture/route design: HIGH.
- Pitfalls: HIGH for 1, 2, 4, 5, 7, 8 (observed); MEDIUM for 3 (community sources).

**Research date:** 2026-11-06
**Valid until:** 2026-12-06 (Next and OpenNext move quickly; recheck OpenNext Node-proxy notes on upgrade)
