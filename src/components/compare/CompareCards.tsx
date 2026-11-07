"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Brandmark } from "@/components/Brandmark";
import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { StockError, stateButton } from "@/components/stock/StockError";
import { ArrowRightIcon, CloseIcon, PlusIcon } from "@/components/stock/icons";
import { useCarsByIds } from "@/components/stock/useCarsByIds";
import { showToast } from "@/components/toast";
import { accentButton, secondaryButton } from "@/components/ui";
import { MAX_COMPARE, clearCompare, removeCompare, restoreCompare, useCompareIds } from "@/lib/compare/store";
import { rank } from "@/lib/compare/rank";
import type { Mark } from "@/lib/compare/rank";
import { carTitle, formatKm, formatPrice, specRows } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

const never = () => () => {};

// What the cards compare. `better` is which end is good news for a buyer; with none (the engine) the marks are only higher and lower.
type Row = { label: string; number?: (c: Car) => number | undefined; text: (c: Car) => string | undefined; better?: "low" | "high" };
const spec = (label: string) => (c: Car) => specRows(c).find((r) => r.label === label)?.value;
const ROWS: Row[] = [
  { label: "Price", number: (c) => (isSold(c) ? undefined : c.priceEur), text: (c) => (isSold(c) ? "Sold" : formatPrice(c.priceEur)), better: "low" },
  { label: "Year", number: (c) => c.year, text: (c) => String(c.year), better: "high" },
  { label: "Mileage", number: (c) => c.mileageKm, text: (c) => (c.mileageKm === undefined ? undefined : formatKm(c.mileageKm)), better: "low" },
  { label: "Fuel", text: spec("Fuel") },
  { label: "Transmission", text: spec("Transmission") },
  { label: "Engine", number: (c) => c.engineLitres, text: spec("Engine") },
  { label: "Body type", text: spec("Body type") },
];

// The word, an arrow and a colour, so the colour is never the only sign. Two cars say Higher and Lower; three say Highest and Lowest.
function Marker({ mark, better, of }: { mark: Mark; better?: "low" | "high"; of: number }) {
  if (!mark) return null;
  const word = `${mark === "low" ? "Low" : "High"}${of > 2 ? "est" : "er"}`;
  const tone = !better ? "bg-hairline text-text-2" : mark === better ? "bg-better/15 text-better" : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-meta font-semibold ${tone}`}>
      <span aria-hidden="true">{mark === "low" ? "▼" : "▲"}</span>
      <span>{word}</span>
    </span>
  );
}

function Empty() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-heading font-semibold">Nothing to compare yet</h2>
      <p className="mt-2 text-body text-text-2">Open a car and tap Compare. You can compare up to three.</p>
      <Link href="/used-cars" className={stateButton}>
        See used cars
      </Link>
    </div>
  );
}

// The empty place next to the cars picked so far: the next one goes here.
function Placeholder() {
  return (
    <div data-testid="compare-placeholder" className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed border-hairline p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-card">
        <PlusIcon className="size-6" />
      </span>
      <p className="text-body font-semibold">Add a car to compare</p>
      <Link href="/used-cars" className={`inline-flex items-center gap-2 ${accentButton}`}>
        Add a car
        <ArrowRightIcon className="size-5" />
      </Link>
    </div>
  );
}

// The ids live in this browser, so the cars come from /api/saved-cars. The list is read once on arrival; removing a car here drops
// its card straight away and does not fetch again.
export function CompareCards() {
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
      <div aria-hidden className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCards count={ids ? Math.min(ids.length, MAX_COMPARE) : MAX_COMPARE} />
      </div>
    );
  }
  const cars = live.flatMap((id) => loaded.cars.filter((c) => c.id === id));
  if (cars.length === 0) return <Empty />;

  const ranks = ROWS.map((row) => (row.number ? rank(cars.map(row.number)) : []));

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-text-2">
          {cars.length} of {MAX_COMPARE} cars
        </p>
        <button
          type="button"
          onClick={() => {
            clearCompare();
            showToast("Compare list cleared", () => restoreCompare(live));
          }}
          className={`h-11 px-4 text-meta ${secondaryButton}`}
        >
          Clear all
        </button>
      </div>
      {loaded.gone > 0 && <p className="mb-4 text-meta text-text-2">A car you picked is no longer for sale, so it was removed.</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cars.map((car, ci) => (
          <article key={car.id} data-testid="compare-card" aria-label={carTitle(car)} className="flex flex-col overflow-hidden rounded-card border border-hairline bg-card">
            <div className="relative aspect-[4/3] bg-photo-bg">
              {car.photos[0] && <Image src={car.photos[0].src} width={600} height={450} alt="" className="size-full object-cover" />}
              <Brandmark />
              <button
                type="button"
                aria-label={`Remove ${carTitle(car)}`}
                onClick={() => {
                  removeCompare([car.id]);
                  showToast(`Removed ${car.make} ${car.model}`, () => restoreCompare([car.id]));
                }}
                className="absolute right-2 top-2 z-20 flex size-11 items-center justify-center rounded-full bg-ink/60 backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 p-4 pb-2">
              <p className="text-meta text-text-2">{car.make}</p>
              <h2 className="text-body font-semibold">
                <Link href={`/used-cars/${car.slug}`} className="hover:underline">
                  {[car.model, car.variant].filter(Boolean).join(" ")}
                </Link>
              </h2>
            </div>
            <dl className="flex flex-col divide-y divide-hairline px-4 pb-2">
              {ROWS.map((row, ri) => (
                <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                  <dt className="text-meta text-text-2">{row.label}</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-2 text-right">
                    <span className="text-body font-semibold tabular-nums">{row.text(car) ?? "-"}</span>
                    <Marker mark={ranks[ri][ci]} better={row.better} of={cars.length} />
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
        {cars.length < MAX_COMPARE && <Placeholder />}
      </div>
    </>
  );
}
