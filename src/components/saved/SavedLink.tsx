"use client";

import Link from "next/link";
import { HeartIcon } from "@/components/stock/icons";
import { useSavedIds } from "@/lib/saved/store";

// The count slot is always there at a fixed width, empty on the server, so the number arriving after hydration moves nothing.
export function SavedLink() {
  const n = useSavedIds().length;
  return (
    <Link href="/saved" aria-label={n ? `Saved cars, ${n}` : "Saved cars"} className="relative -mr-2 flex h-11 w-11 items-center justify-center gap-1 focus-visible:outline-white lg:mr-0 lg:w-auto">
      <HeartIcon />
      {/* A badge on the heart on a phone, so the heart sits centred in its box like the menu button; a plain number beside it from 1024px. */}
      <span aria-hidden="true" className="absolute right-0 top-1 whitespace-nowrap text-meta font-semibold tabular-nums lg:static lg:w-5">
        {n > 0 && <span className="rounded-full bg-accent px-1 text-[11px] leading-4 text-white transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none lg:bg-transparent lg:px-0 lg:text-meta lg:text-inherit">{n > 99 ? "99+" : n}</span>}
      </span>
    </Link>
  );
}
