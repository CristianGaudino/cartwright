import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ListingCard } from "@/components/stock/ListingCard";
import { pageMain, pageTitle, subTitle } from "@/components/ui";
import { ChevronRightIcon } from "@/components/stock/icons";
import { countLabel } from "@/lib/stock/format";
import { itemListJsonLd, landingFilter, landingIntro, landingName } from "@/lib/stock/landing";
import type { Landing } from "@/lib/stock/landing";
import { DEFAULT_QUERY, stockHref } from "@/lib/stock/query";
import type { FacetOption } from "@/lib/stock/types";
import type { LandingData } from "./data";

const SHOWN = 12;
const button = "inline-flex h-12 items-center rounded-control px-6 font-semibold active:scale-[0.97] motion-reduce:active:scale-100";

function Breadcrumb({ landing }: { landing: Landing }) {
  const trail: { label: string; href?: string }[] = [{ label: "Used Cars", href: "/used-cars" }];
  if (landing.kind === "body") trail.push({ label: landing.body });
  else if (landing.kind === "make") trail.push({ label: landing.make });
  else trail.push({ label: landing.make, href: `/used-cars/${landing.makeSlug}` }, { label: landing.model });
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center text-meta">
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center">
            {i > 0 && <ChevronRightIcon className="mx-1 size-4 shrink-0 text-text-2" />}
            {c.href ? (
              <Link href={c.href} className="inline-flex min-h-11 items-center underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="inline-flex min-h-11 items-center text-text-2">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Navigation, never accent. Only options with a car in stock; no heading when there are none.
function LinkChips({ heading, options, href }: { heading: string; options: FacetOption[]; href: (o: FacetOption) => string }) {
  const shown = options.filter((o) => o.count > 0);
  if (!shown.length) return null;
  return (
    <section className="mt-6">
      <h2 className={subTitle}>{heading}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {shown.map((o) => (
          <li key={o.value} className="min-w-0 max-w-full">
            <Link
              href={href(o)}
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-control bg-card px-4 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <span className="truncate font-semibold">{o.label}</span>
              <span className="shrink-0 text-meta text-text-2">{o.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const toPage = (o: FacetOption) => `/used-cars/${o.value}`;
const toModel = (o: FacetOption) => `/used-cars/${o.parent}/${o.value}`; // model options carry their makeSlug

export function LandingPage({ data }: { data: LandingData }) {
  const { landing, cars, facts, facets, sold } = data;
  const name = landingName(landing);
  const shown = cars.slice(0, SHOWN);
  return (
    <main className={pageMain}>
      <Breadcrumb landing={landing} />
      <h1 className={`mt-6 ${pageTitle}`}>Used {name}</h1>
      {facts && (
        <>
          <JsonLd data={itemListJsonLd(shown)} />
          <p className="mt-4 max-w-[65ch] text-body">{landingIntro(landing, facts)}</p>
          {landing.kind === "make" && <LinkChips heading="Models" options={facets.model} href={toModel} />}
          {landing.kind === "body" && <LinkChips heading="Makes" options={facets.make} href={toPage} />}
          {landing.kind === "model" && (
            <>
              <LinkChips heading={`More ${landing.make}`} options={facets.model.filter((o) => o.value !== landing.modelSlug)} href={toModel} />
              <Link href={`/used-cars/${landing.makeSlug}`} className="mt-4 inline-flex min-h-11 items-center font-semibold underline">
                All {landing.make}
              </Link>
            </>
          )}
          <p className="mt-6 text-meta text-text-2">{countLabel(facts.n)}</p>
          <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((car, i) => (
              <ListingCard key={car.id} car={car} priority={i < 2} />
            ))}
          </div>
          {facts.n > SHOWN && (
            <Link href={stockHref({ ...DEFAULT_QUERY, ...landingFilter(landing) })} className={`mt-8 border border-control ${button}`}>
              See all {facts.n} {name}
            </Link>
          )}
          {landing.kind === "make" && <LinkChips heading="Body types" options={facets.body} href={toPage} />}
        </>
      )}
      {!facts && (
        <>
          <h2 className="mt-4 text-heading font-semibold">No {name} in stock right now</h2>
          <p className="mt-2 max-w-[65ch] text-body">Have a look at these instead.</p>
          {landing.kind === "body" ? (
            <LinkChips heading="Body types in stock" options={facets.body} href={toPage} />
          ) : (
            <LinkChips heading="Makes in stock" options={facets.make} href={toPage} />
          )}
          {sold.length > 0 && (
            <section className="mt-8">
              <h2 className={subTitle}>Recently sold {name}</h2>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {sold.map((car) => (
                  <ListingCard key={car.id} car={car} priority={false} />
                ))}
              </div>
            </section>
          )}
          {/* D-15: the empty page's call to action, in place of the plain used-cars button (Phase 2 D-08). */}
          <Link href="/find-a-car" className="mt-8 flex min-h-11 w-fit items-center text-body underline">
            Can&apos;t find it? Ask us to find it for you.
          </Link>
        </>
      )}
    </main>
  );
}
