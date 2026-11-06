"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ListingCard } from "@/components/stock/ListingCard";
import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { useSavedIds } from "@/lib/saved/store";
import type { Car } from "@/lib/stock/types";

const never = () => () => {};
const grid = "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3";

// The ids live in this browser, so the cars are fetched by id from /api/saved-cars (the stock stays on the server).
export function SavedCars() {
  const live = useSavedIds();
  // False on the server and during hydration, when useSavedIds still reports the server's empty list.
  const read = useSyncExternalStore(never, () => true, () => false);
  // Taken once: unsaving a car here keeps its card until the next visit, so a mistaken tap can be undone (UI-SPEC).
  const [ids, setIds] = useState<string[] | null>(null);
  if (read && ids === null) setIds(live); // adjusting state during render, not an effect
  const [cars, setCars] = useState<Car[] | null>(null);

  useEffect(() => {
    if (!ids?.length) return;
    let stale = false;
    fetch(`/api/saved-cars?ids=${ids.join(",")}`)
      .then((r) => r.json() as Promise<{ cars: Car[] }>)
      .then((body) => !stale && setCars(body.cars));
    return () => {
      stale = true;
    };
  }, [ids]);

  if (!cars) {
    return (
      <div aria-hidden className={grid}>
        <SkeletonCards count={ids ? Math.min(ids.length, 6) : 3} />
      </div>
    );
  }
  return (
    <div className={grid}>
      {cars.map((car, i) => (
        <ListingCard key={car.id} car={car} priority={i < 2} />
      ))}
    </div>
  );
}
