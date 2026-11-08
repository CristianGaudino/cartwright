import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FeaturedRow } from "@/components/home/FeaturedRow";
import { HomeSearch } from "@/components/home/HomeSearch";
import { TrustStrip } from "@/components/home/TrustStrip";
import { JsonLd } from "@/components/JsonLd";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { ListingCard } from "@/components/stock/ListingCard";
import { ArrowRightIcon } from "@/components/stock/icons";
import { accentButton, press, slash, textLink } from "@/components/ui";
import { dealerJsonLd } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS_LINES, SITE_NAME } from "@/lib/site";
import { stock } from "@/lib/stock";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import { searchOptions } from "@/lib/stock/search-options";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Used cars in Tralee` },
  description: "Browse the used cars in stock at our dealership in Tralee, Co. Kerry.",
};

const outline = `inline-flex h-12 items-center gap-2 rounded-control border border-control px-6 font-semibold ${press}`;

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  // The home page must never error: a stock failure shows a line in place of the row, and the search still renders (UI-SPEC state table).
  const log = (e: unknown) => console.error("stock.query failed", e instanceof Error ? e.name : typeof e); // as /used-cars: the name only
  // shortcut: one query covers the stock while it is under 1000 cars (as the sitemap); the first six are the featured row and all of
  // them feed the search drop-downs, so every choice there has a car behind it.
  const [all, reviews] = await Promise.all([stock.query({ ...DEFAULT_QUERY, pageSize: 1000 }).catch((e) => (log(e), null)), getReviews()]);
  const result = all && { ...all, cars: all.cars.slice(0, 6) };
  const search = searchOptions(all?.cars ?? []);
  return (
    <main className="flex flex-col">
      <JsonLd data={dealerJsonLd(reviews)} />
      <section className="hero-bg border-b border-hairline">
        <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pb-12 lg:pt-20">
          <p className={`text-meta font-semibold uppercase tracking-wider ${slash}`}>Quality Used Cars</p>
          <h1 className="mt-4 max-w-[10ch] text-hero font-bold lg:text-hero-lg">Find Your Next Car</h1>
          <p className="mt-4 max-w-[40ch] text-body">A carefully selected range of quality used cars, backed by trusted service and straightforward finance.</p>
          <p className="mt-2 max-w-[65ch] text-meta text-text-2">Find us at {DEALER_ADDRESS_LINES.join(", ")}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/used-cars" className={`inline-flex items-center gap-2 ${accentButton}`}>
              Browse Our Stock
              <ArrowRightIcon className="size-5" />
            </Link>
            <Link href="/finance" className={outline}>
              Estimate Your Finance
            </Link>
          </div>
          <div className="mt-8 lg:mt-12">
            <HomeSearch makes={search.makes} bodies={search.bodies} models={search.models} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:gap-16 lg:px-8">
        <TrustStrip />

        <section className="flex flex-col gap-4">
          {!result ? (
            <>
              <p className="text-body">We could not load the cars.</p>
              <Link href="/used-cars" className={textLink}>
                See Used Cars
              </Link>
            </>
          ) : result.cars.length === 0 ? (
            <>
              <h2 className="text-heading font-semibold">No cars listed right now</h2>
              <Link href="/find-a-car" className={textLink}>
                Cannot find it? Ask us to find it for you.
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <h2 className={`text-heading font-bold sm:text-display ${slash}`}>Featured Stock</h2>
                <Link href="/used-cars" className={`${textLink} shrink-0 gap-2 whitespace-nowrap`}>
                  View All Stock
                  <ArrowRightIcon className="size-5" />
                </Link>
              </div>
              <FeaturedRow label="Featured Stock">
                {result.cars.map((car) => (
                  <li key={car.id} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
                    <ListingCard car={car} priority={false} />
                  </li>
                ))}
              </FeaturedRow>
            </>
          )}
        </section>

        <section className="hero-bg flex flex-col items-start gap-3 rounded-card border border-hairline p-6 lg:p-10">
          <h2 className="text-display font-bold">Finance Made Simple</h2>
          <p className="max-w-[40ch] text-body">Estimate your monthly payment online, then send us your details to start the process.</p>
          <Link href="/finance" className={`mt-2 inline-flex items-center gap-2 ${accentButton}`}>
            Check Finance Options
            <ArrowRightIcon className="size-5" />
          </Link>
        </section>

        <ReviewsStrip data={reviews} />
      </div>
    </main>
  );
}
