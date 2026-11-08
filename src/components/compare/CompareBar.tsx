"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { showToast } from "@/components/toast";
import { clearCompare, MAX_COMPARE, restoreCompare, toggleCompare, useCompareIds } from "@/lib/compare/store";
import { press } from "@/components/ui";

// A pill at the bottom of every page once a car is picked for comparison. Not on /compare itself. The layout places it.
export function CompareBar() {
  const ids = useCompareIds();
  const path = usePathname();
  const carId = /^\/used-cars\/[a-z0-9-]+-(\d{1,12})$/.exec(path)?.[1];
  if (ids.length === 0 || path === "/compare") return null;
  return (
    <div role="region" aria-label="Compare cars" className="pointer-events-auto flex items-center gap-3 rounded-control border border-hairline bg-card py-1 pl-4 pr-1 shadow-lift">
      <p className="text-meta font-semibold">
        {ids.length} of {MAX_COMPARE} to compare
      </p>
      <button
        type="button"
        onClick={() => {
          clearCompare();
          showToast("Compare list cleared", () => restoreCompare(ids));
        }}
        className="min-h-11 rounded-control px-2 text-meta font-semibold underline"
      >
        Clear
      </button>
      <Link
        href="/compare"
        onClick={() => {
          // On a car page the car in view joins the list, so Compare opens it with that car in it.
          if (carId && !ids.includes(carId) && ids.length < MAX_COMPARE) toggleCompare(carId);
        }}
        className={`inline-flex h-11 items-center rounded-control bg-accent px-5 text-meta font-semibold text-white ${press}`}
      >
        Compare
      </Link>
    </div>
  );
}
