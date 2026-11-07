"use client";

import { useEffect, useRef, useState } from "react";
import type { Car } from "@/lib/stock/types";

export type Loaded = { cars: Car[]; gone: number };

// The ids live in this browser (saved or compare), so the cars are fetched by id from /api/saved-cars: the stock stays on the
// server. `onGone` hears the ids the stock no longer has, only on a good answer, so a failed load never loses a car.
export function useCarsByIds(ids: string[] | null, onGone?: (goneIds: string[]) => void) {
  const [loaded, setLoaded] = useState<Loaded | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });

  useEffect(() => {
    if (!ids?.length) return;
    let stale = false;
    fetch(`/api/saved-cars?ids=${ids.join(",")}`)
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<{ cars: Car[]; goneIds: string[] }>;
      })
      .then(({ cars, goneIds }) => {
        if (stale) return;
        if (goneIds.length) gone.current?.(goneIds);
        setLoaded({ cars, gone: goneIds.length });
      })
      .catch(() => !stale && setLoaded("error"));
    return () => {
      stale = true;
    };
  }, [ids, attempt]);

  const retry = () => {
    setLoaded(null);
    setAttempt((n) => n + 1);
  };
  return { loaded, retry };
}
