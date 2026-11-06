import Link from "next/link";
import { ListingCard } from "@/components/stock/ListingCard";
import { countLabel } from "@/lib/stock/format";
import { landingFilter, landingIntro, landingName } from "@/lib/stock/landing";
import { DEFAULT_QUERY, stockHref } from "@/lib/stock/query";
import type { LandingData } from "./data";

const SHOWN = 12;
const button = "inline-flex h-12 items-center rounded-control px-6 font-semibold active:scale-[0.97] motion-reduce:active:scale-100";

export function LandingPage({ data }: { data: LandingData }) {
  const { landing, cars, facts } = data;
  const name = landingName(landing);
  const shown = cars.slice(0, SHOWN);
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Used {name}</h1>
      {facts && (
        <>
          <p className="mt-4 max-w-[65ch] text-body">{landingIntro(landing, facts)}</p>
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
        </>
      )}
    </main>
  );
}
