import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { JsonLd } from "@/components/JsonLd";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { ListingCard } from "@/components/stock/ListingCard";
import { ChevronRightIcon } from "@/components/stock/icons";
import { dealerJsonLd } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { SITE_NAME } from "@/lib/site";
import { stock } from "@/lib/stock";
import { DEFAULT_QUERY } from "@/lib/stock/query";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Used cars in Tralee` },
  description: "Browse the used cars in stock at our dealership in Tralee, Co. Kerry.",
};

const textLink = "inline-flex min-h-11 w-fit items-center underline";

// One whole-card link, so one tab stop. Used only here.
function HelpCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full min-h-11 items-center gap-4 rounded-card border border-hairline bg-card p-4 transition-[box-shadow,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:active:scale-100 contrast-more:border-text [@media(hover:hover)]:hover:shadow-lift"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-semibold">{title}</span>
          <span className="text-meta text-text-2">{text}</span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-text-2" />
      </Link>
    </li>
  );
}

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  // The home page must never error: a stock failure shows a line in place of the grid (UI-SPEC state table).
  const latest = stock.query({ ...DEFAULT_QUERY, pageSize: 6 }).catch((e) => {
    console.error("stock.query failed", e instanceof Error ? e.name : typeof e); // as /used-cars: the name only
    return null;
  });
  const [result, reviews] = await Promise.all([latest, getReviews()]);
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:gap-16 lg:px-8">
      <JsonLd data={dealerJsonLd(reviews)} />
      {/* No image: the h1 is the LCP element. A plain GET form, so search works without JavaScript. */}
      <section className="flex flex-col">
        <h1 className="text-display font-semibold">Used cars in Tralee</h1>
        <p className="mt-2 max-w-[65ch] text-body">Browse the cars we have in stock.</p>
        <form action="/used-cars" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="home-search" className="sr-only">
            Search make or model
          </label>
          <input
            id="home-search"
            type="search"
            name="q"
            placeholder="Search make or model"
            enterKeyHint="search"
            maxLength={80}
            className="h-12 min-w-0 flex-1 rounded-control border border-control bg-card px-4 text-body placeholder:text-text-2 contrast-more:border-text"
          />
          <button type="submit" className="h-12 shrink-0 rounded-control bg-accent px-6 font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100">
            Search
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        {!result ? (
          <>
            <p className="text-body">We could not load the cars.</p>
            <Link href="/used-cars" className={textLink}>
              See used cars
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
            <h2 className="text-heading font-semibold">Latest arrivals</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.cars.map((car) => (
                <ListingCard key={car.id} car={car} priority={false} />
              ))}
            </div>
            <Link
              href="/used-cars"
              className="mt-4 inline-flex h-12 w-fit items-center rounded-control border border-control px-6 font-semibold active:scale-[0.97] motion-reduce:active:scale-100"
            >
              See all {result.total} used cars
            </Link>
          </>
        )}
      </section>

      <ReviewsStrip data={reviews} />

      {/* Merges "why buy from us" and the calls to action (D-04): selling points are the dealer's to supply, not invented here. */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-heading font-semibold">How we can help</h2>
          <p className="text-body">A local dealer in Tralee, Co. Kerry.</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HelpCard href="/finance" title="Finance" text="Work out a monthly payment." />
          <HelpCard href="/sell-your-car" title="Sell your car" text="Get a valuation." />
          <HelpCard href="/find-a-car" title="Find a car" text="Tell us what you want." />
        </ul>
      </section>
    </main>
  );
}
