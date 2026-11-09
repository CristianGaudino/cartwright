import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IconBadge, TitleText } from "@/components/Feature";
import { AutoCarousel } from "@/components/AutoCarousel";
import { HomeSearch } from "@/components/home/HomeSearch";
import { TrustStrip } from "@/components/home/TrustStrip";
import { JsonLd } from "@/components/JsonLd";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { ListingCard } from "@/components/stock/ListingCard";
import { ArrowRightIcon } from "@/components/stock/icons";
import { accentButton, carSlide, press, sectionTitle, slash, subTitle, textLink } from "@/components/ui";
import { dealerJsonLd } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_ADDRESS_LINES, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { searchOptions } from "@/lib/stock/search-options";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Used cars in ${DEALER_ADDRESS.town}` },
  description: `Browse the used cars in stock at our dealership in ${DEALER_LOCATION}.`,
};

const outline = `inline-flex h-12 w-full items-center justify-center gap-2 sm:w-auto rounded-control border border-control px-6 font-semibold ${press}`;

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  // The home page must never error: a stock failure shows a line in place of the row, and the search still renders (UI-SPEC state table).
  // The first six are the featured row and all of them feed the search drop-downs, so every choice there has a car behind it.
  const [all, reviews] = await Promise.all([queryAllOrNull(), getReviews()]);
  const result = all && { ...all, cars: all.cars.slice(0, 6) };
  const search = searchOptions(all?.cars ?? []);
  return (
    <main className="flex flex-col">
      {/* The hero photo is a CSS background, which the browser finds late: ask for the right size at once (React moves these to the head). */}
      <link rel="preload" as="image" href="/brand/hero-sm.webp" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/brand/hero.webp" media="(min-width: 768px)" fetchPriority="high" />
      <JsonLd data={dealerJsonLd(reviews)} />
      <section className="hero-photo relative border-b border-hairline">
        <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pb-12 lg:pt-20">
          <p className={`text-meta font-semibold uppercase tracking-wider ${slash}`}>Quality Used Cars</p>
          <h1 className="mt-4 max-w-[10ch] text-hero font-bold lg:text-hero-lg">Find Your Next Car</h1>
          <p className="mt-4 max-w-[40ch] text-body">A carefully selected range of quality used cars, backed by trusted service and straightforward finance.</p>
          <p className="mt-2 max-w-[65ch] text-meta text-text-2">Find us at {DEALER_ADDRESS_LINES.join(", ").replace(/ (\S+)$/, " $1")}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/used-cars" className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto ${accentButton}`}>
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
              <p className="text-body">We couldn&apos;t load the cars.</p>
              <Link href="/used-cars" className={textLink}>
                See Used Cars
              </Link>
            </>
          ) : result.cars.length === 0 ? (
            <>
              <h2 className={subTitle}>No Cars Listed Right Now</h2>
              <Link href="/find-a-car" className={textLink}>
                Can&apos;t find it? Ask us to find it for you.
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 className={sectionTitle}>Featured Stock</h2>
                <Link href="/used-cars" className={`${textLink} shrink-0 gap-2 whitespace-nowrap`}>
                  View All Stock
                  <ArrowRightIcon className="size-5" />
                </Link>
              </div>
              <AutoCarousel label="Featured Stock">
                {result.cars.map((car) => (
                  <li key={car.id} className={carSlide}>
                    <ListingCard car={car} priority={false} oneLine />
                  </li>
                ))}
              </AutoCarousel>
            </>
          )}
        </section>

        <section className="hero-bg grid grid-cols-1 gap-8 rounded-card border border-hairline p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="flex flex-col items-start gap-4">
            <h2 className={sectionTitle}>Finance Made Simple</h2>
            <p className="max-w-[40ch] text-body text-text-2">Estimate your monthly payment online, then send us your details to start the process.</p>
            <Link href="/finance" className={`mt-2 inline-flex items-center gap-2 ${accentButton} lg:h-14 lg:px-8 lg:text-heading`}>
              Check Finance Options
              <ArrowRightIcon className="size-5" />
            </Link>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["1", "Pick a car", "Or type a price. Choose a deposit and a term."],
              ["2", "See an estimate", "A monthly figure, worked out as you go."],
              ["3", "We call you", "Send your details and we come back with the real amounts."],
            ].map(([n, title, text]) => (
              <li key={n} className="flex gap-4 rounded-card border border-hairline bg-surface/60 p-4 sm:flex-col">
                <IconBadge size="sm">{n}</IconBadge>
                <TitleText title={title} text={text} />
              </li>
            ))}
          </ol>
        </section>

        <ReviewsStrip data={reviews} />
      </div>
    </main>
  );
}
