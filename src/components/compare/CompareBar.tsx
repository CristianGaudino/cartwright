"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { showToast } from "@/components/toast";
import { clearCompare, MAX_COMPARE, restoreCompare, useCompareIds } from "@/lib/compare/store";
import { press } from "@/components/ui";

// A pill at the bottom of every page once a car is picked for comparison. Not on /compare itself. The layout places it.
export function CompareBar() {
  const ids = useCompareIds();
  const path = usePathname();
  if (ids.length === 0 || path === "/compare") return null;
  return (
    <div role="region" aria-label="Compare cars" className="pointer-events-auto flex items-center gap-3 rounded-full border border-hairline bg-card py-2 pl-5 pr-2 shadow-lift">
      <p className="text-meta font-semibold">
        {ids.length} of {MAX_COMPARE} to compare
      </p>
      <button
        type="button"
        onClick={() => {
          clearCompare();
          showToast("Compare list cleared", () => restoreCompare(ids));
        }}
        className="min-h-11 text-meta font-semibold underline"
      >
        Clear
      </button>
      <Link href="/compare" className={`inline-flex h-11 items-center rounded-full bg-accent px-5 text-meta font-semibold text-white ${press}`}>
        Compare
      </Link>
    </div>
  );
}
