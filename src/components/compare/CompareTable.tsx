"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Brandmark } from "@/components/Brandmark";
import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { StockError, stateButton } from "@/components/stock/StockError";
import { useCarsByIds } from "@/components/stock/useCarsByIds";
import { clearCompare, removeCompare, useCompareIds } from "@/lib/compare/store";
import { carTitle, formatPrice, specRows } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

const never = () => () => {};
// The mockup's rows. A car with no value for one shows a dash, so the columns stay level.
const ROWS = ["Year", "Mileage", "Fuel", "Transmission", "Engine", "Body type"];
const cell = "border-b border-hairline px-4 py-3 align-top";

function Empty() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-heading font-semibold">Nothing to compare yet</h2>
      <p className="mt-2 text-body text-text-2">Tap Compare on up to three cars, then come back here.</p>
      <Link href="/used-cars" className={stateButton}>
        See used cars
      </Link>
    </div>
  );
}

// The ids live in this browser, so the cars come from /api/saved-cars. The list is read once on arrival; removing a car here
// drops its column straight away and does not fetch again.
export function CompareTable() {
  const live = useCompareIds();
  // False on the server and during hydration, when the list still reads as the server's empty one.
  const read = useSyncExternalStore(never, () => true, () => false);
  const [ids, setIds] = useState<string[] | null>(null);
  if (read && ids === null) setIds(live); // adjusting state during render, not an effect
  const { loaded, retry } = useCarsByIds(ids, removeCompare);

  if (ids?.length === 0 || (ids && live.length === 0)) return <Empty />;
  if (loaded === "error") return <StockError retry={retry} />;
  if (!loaded) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <SkeletonCards count={ids ? Math.min(ids.length, 3) : 3} />
      </div>
    );
  }
  const cars = live.flatMap((id) => loaded.cars.filter((c) => c.id === id));
  if (cars.length === 0) return <Empty />;

  return (
    <>
      {loaded.gone > 0 && <p className="mb-4 text-meta text-text-2">A car you picked is no longer for sale, so it was removed.</p>}
      <div className="overflow-x-auto rounded-card border border-hairline bg-card">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">Cars side by side</caption>
          <thead>
            <tr>
              <td className="sticky left-0 w-24 border-b border-hairline bg-card sm:w-36" />
              {cars.map((car) => (
                <th key={car.id} scope="col" className={`${cell} min-w-40 font-normal`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-control bg-photo-bg">
                    {car.photos[0] && <Image src={car.photos[0].src} width={400} height={300} alt="" className="size-full object-cover" />}
                    <Brandmark />
                  </div>
                  <Link href={`/used-cars/${car.slug}`} className="mt-3 block text-body font-semibold hover:underline">
                    {carTitle(car)}
                  </Link>
                  <p className="text-body font-semibold tabular-nums">{isSold(car) ? "Sold" : formatPrice(car.priceEur)}</p>
                  <button type="button" onClick={() => removeCompare([car.id])} className="min-h-11 text-meta font-semibold underline">
                    Remove<span className="sr-only"> {carTitle(car)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((label) => (
              <tr key={label}>
                <th scope="row" className={`${cell} sticky left-0 bg-card text-meta font-semibold text-text-2`}>
                  {label}
                </th>
                {cars.map((car) => (
                  <td key={car.id} className={`${cell} text-body`}>
                    {specRows(car).find((r) => r.label === label)?.value ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {cars.length < 3 && (
          <Link href="/used-cars" className="inline-flex min-h-11 items-center text-body font-semibold underline">
            Add another car
          </Link>
        )}
        <button type="button" onClick={clearCompare} className="min-h-11 text-body font-semibold underline">
          Clear all
        </button>
      </div>
    </>
  );
}
