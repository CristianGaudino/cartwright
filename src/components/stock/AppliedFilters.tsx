"use client";

import { appliedFilters, clearFilters } from "@/lib/stock/query";
import { CloseIcon } from "./icons";
import { useStock } from "./StockShell";

export function AppliedFilters() {
  const { query, summary, facets, navigate } = useStock();
  const chips = appliedFilters(query, facets);
  if (chips.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-label={`Remove ${chip.label}`}
          onClick={() => navigate(chip.next)}
          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-hairline bg-card px-4 text-meta font-semibold active:scale-[0.97] motion-reduce:active:scale-100"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <CloseIcon className="h-4 w-4 shrink-0" />
        </button>
      ))}
      {/* With no matches the empty state carries the one Clear all filters button. */}
      {summary?.total !== 0 && (
        <button
          type="button"
          onClick={() => navigate(clearFilters(query))}
          className="inline-flex min-h-11 items-center px-2 text-meta font-semibold underline active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
