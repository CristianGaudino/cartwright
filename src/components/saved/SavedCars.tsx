"use client";

import Link from "next/link";
import { StateBlock } from "@/components/StateBlock";
import { useState, useSyncExternalStore } from "react";
import { ListingCard } from "@/components/stock/ListingCard";
import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { StockError, stateButton } from "@/components/stock/StockError";
import { useCarsByIds } from "@/components/stock/useCarsByIds";
import { removeSaved, useSavedIds } from "@/lib/saved/store";
import { card } from "@/components/ui";

const never = () => () => {};
const grid = "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3";

function Empty() {
  return (
    <StateBlock title="No saved cars yet" text="Tap the heart on any car to save it here.">
      <Link href="/used-cars" className={stateButton}>
        See Used Cars
      </Link>
    </StateBlock>
  );
}

// The ids live in this browser, so the cars are fetched by id from /api/saved-cars (the stock stays on the server).
export function SavedCars() {
  const live = useSavedIds();
  // False on the server and during hydration, when useSavedIds still reports the server's empty list.
  const read = useSyncExternalStore(never, () => true, () => false);
  // Taken once: unsaving a car here keeps its card until the next visit, so a mistaken tap can be undone (UI-SPEC).
  const [ids, setIds] = useState<string[] | null>(null);
  if (read && ids === null) setIds(live); // adjusting state during render, not an effect
  const { loaded, retry } = useCarsByIds(ids, removeSaved); // pruned only on a good answer, so the note shows once (D-20)

  if (ids?.length === 0) return <Empty />;
  if (loaded === "error") {
    return (
      <StockError retry={retry} />
    );
  }
  if (!loaded) {
    // Never an empty flash, and never a tall one that collapses: one placeholder until storage is read (an empty list is the common case),
    // then one per saved car, up to 6.
    return (
      <div aria-hidden className={grid}>
        <SkeletonCards count={ids ? Math.min(ids.length, 6) : 1} />
      </div>
    );
  }
  const { cars, gone } = loaded;
  return (
    <>
      {gone > 0 && (
        <p role="status" className={`mb-6 ${card} p-4 text-body`}>
          {gone === 1
            ? "1 saved car is no longer available. We removed it from your list."
            : `${gone} saved cars are no longer available. We removed them from your list.`}
        </p>
      )}
      {cars.length ? (
        <div className={grid}>
          {cars.map((car, i) => (
            <ListingCard key={car.id} car={car} priority={i < 2} />
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </>
  );
}
