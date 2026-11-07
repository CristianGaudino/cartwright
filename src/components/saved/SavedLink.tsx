"use client";

import Link from "next/link";
import { HeartIcon } from "@/components/stock/icons";
import { useSavedIds } from "@/lib/saved/store";

// The count slot is always there at a fixed width, empty on the server, so the number arriving after hydration moves nothing.
export function SavedLink() {
  const n = useSavedIds().length;
  return (
    <Link href="/saved" aria-label={n ? `Saved cars, ${n}` : "Saved cars"} className="flex h-11 items-center gap-1 focus-visible:outline-white">
      <HeartIcon />
      <span aria-hidden="true" className="w-5 whitespace-nowrap text-meta font-semibold tabular-nums">
        {n > 0 && <span className="transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none">{n > 99 ? "99+" : n}</span>}
      </span>
    </Link>
  );
}
