import { AutoCarousel } from "@/components/AutoCarousel";
import Link from "next/link";
import { CheckIcon } from "@/components/stock/icons";
import { card, carSlide, slash } from "@/components/ui";
import { ListingCard } from "@/components/stock/ListingCard";
import { specRows } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

const VISIBLE_FEATURES = 12;
const LONG_DESCRIPTION = 700; // characters; the demo's longest is 978
// wrap-anywhere: a bare web address in the dealer's text has no space to break at.
const text = "mt-4 max-w-[65ch] whitespace-pre-line wrap-anywhere";
const h2 = `text-heading font-semibold ${slash}`;

// Server components. Dealer text is rendered as React text only, never as HTML (T-02-14). Each returns nothing when it has nothing to show.
export function AboutCar({ car }: { car: Car }) {
  if (!car.description) return null;
  return (
    <section>
      <h2 className={h2}>About This Car</h2>
      {car.description.length > LONG_DESCRIPTION ? (
        <>
          {/* One copy of the text: the checkbox, before it, lifts the clamp (peer), so it works without JavaScript and the page holds the text once. */}
          <input type="checkbox" id={`more-${car.id}`} className="peer sr-only" />
          <p className={`${text} line-clamp-8 peer-checked:line-clamp-none`}>{car.description}</p>
          <label
            htmlFor={`more-${car.id}`}
            className="flex min-h-11 cursor-pointer items-center font-semibold peer-focus-visible:underline [&>span:last-child]:hidden peer-checked:[&>span:first-child]:hidden peer-checked:[&>span:last-child]:inline"
          >
            <span>Read more</span>
            <span>Show less</span>
          </label>
        </>
      ) : (
        <p className={text}>{car.description}</p>
      )}
    </section>
  );
}

export function Specifications({ car }: { car: Car }) {
  return (
    <section>
      <h2 className={h2}>Specifications</h2>
      <dl className={`mt-4 grid grid-cols-1 gap-x-6 ${card} p-4 sm:grid-cols-2`}>
        {specRows(car).map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b border-hairline py-3">
            <dt className="text-text-2">{r.label}</dt>
            <dd className="text-right font-semibold">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
    {items.map((f, i) => (
      <li key={i} className="flex items-start gap-2">
        <CheckIcon className="mt-1 size-4 shrink-0" />
        <span className="min-w-0 break-words">{f}</span>
      </li>
    ))}
  </ul>
);

export function Equipment({ car }: { car: Car }) {
  const all = car.features ?? [];
  if (!all.length) return null;
  const rest = all.slice(VISIBLE_FEATURES);
  return (
    <section>
      <h2 className={h2}>Equipment</h2>
      <div className="mt-4">
        <List items={all.slice(0, VISIBLE_FEATURES)} />
        {rest.length > 0 && (
          // Native <details>: works without JavaScript.
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center font-semibold [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show all {all.length}</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <List items={rest} />
          </details>
        )}
      </div>
    </section>
  );
}

export function SimilarCars({ car, cars }: { car: Car; cars: Car[] }) {
  if (!cars.length) return null;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h2 className={h2}>Similar Cars</h2>
        {/* More of the same kind of car, and more of the same make. */}
        <div className="flex flex-wrap gap-x-6">
          {car.bodySlug && car.bodyType && (
            <Link href={`/used-cars/${car.bodySlug}`} className="inline-flex min-h-11 items-center font-semibold underline">
              See All {car.bodyType}s
            </Link>
          )}
          <Link href={`/used-cars/${car.makeSlug}`} className="inline-flex min-h-11 items-center font-semibold underline">
            See All {car.make}
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <AutoCarousel label="Similar cars">
          {cars.map((c) => (
            <li key={c.id} className={carSlide}>
              <ListingCard car={c} priority={false} oneLine />
            </li>
          ))}
        </AutoCarousel>
      </div>
    </section>
  );
}
