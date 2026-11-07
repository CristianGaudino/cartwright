import Link from "next/link";
import { CheckIcon } from "@/components/stock/icons";
import { slash } from "@/components/ui";
import { ListingCard } from "@/components/stock/ListingCard";
import { specRows } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

const VISIBLE_FEATURES = 12;
const h2 = `text-heading font-semibold ${slash}`;

// Server components. Dealer text is rendered as React text only, never as HTML (T-02-14). Each returns nothing when it has nothing to show.
export function AboutCar({ car }: { car: Car }) {
  if (!car.description) return null;
  return (
    <section>
      <h2 className={h2}>About This Car</h2>
      <p className="mt-4 max-w-[65ch] whitespace-pre-line">{car.description}</p>
    </section>
  );
}

export function Specifications({ car }: { car: Car }) {
  return (
    <section>
      <h2 className={h2}>Specifications</h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 rounded-card border border-hairline bg-card p-4 sm:grid-cols-2">
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
      <div className="flex items-center justify-between gap-4">
        <h2 className={h2}>Similar Cars</h2>
        <Link href={`/used-cars/${car.makeSlug}`} className="inline-flex min-h-11 items-center font-semibold underline">
          See all {car.make}
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cars.map((c) => (
          <ListingCard key={c.id} car={c} priority={false} />
        ))}
      </div>
    </section>
  );
}
