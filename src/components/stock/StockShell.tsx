"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useOptimistic, useState, useTransition } from "react";
import { countLabel } from "@/lib/stock/format";
import { clearFilters, stockHref } from "@/lib/stock/query";
import { SORT_KEYS } from "@/lib/stock/types";
import type { Facets, SortKey, StockQuery } from "@/lib/stock/types";
import { AppliedFilters } from "./AppliedFilters";
import { rememberList } from "./BackToCars";
import { FilterSheet } from "./FilterSheet";
import { ChevronDownIcon } from "./icons";
import { SearchBox, StockFilters } from "./StockFilters";
import { stateButton } from "./StockError";

type Summary = { total: number; facets: Facets } | null;
type Stock = {
  query: StockQuery;
  summary: Summary;
  facets: Facets | null; // the facets of the last result that loaded, so a failed load keeps the filters
  pending: boolean;
  navigate: (next: StockQuery, opts?: { scroll?: boolean }) => void;
};

const StockContext = createContext<Stock | null>(null);

export function useStock(): Stock {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockShell");
  return ctx;
}

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest listed",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "year-desc": "Year: newest first",
  "km-asc": "Mileage: lowest first",
};

function SortControl({ className }: { className: string }) {
  const { query, navigate } = useStock();
  const id = useId();
  return (
    <div className={`min-w-0 items-center gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only text-meta font-semibold sm:not-sr-only">
        Sort
      </label>
      <div className="relative min-w-0">
        <select
          id={id}
          value={query.sort}
          onChange={(e) => {
            const sort = SORT_KEYS.find((k) => k === e.target.value);
            if (sort) navigate({ ...query, sort, page: 1 });
          }}
          className="h-12 w-full min-w-0 appearance-none truncate rounded-control border border-control bg-card py-0 pl-3 pr-10 text-body"
        >
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-3 h-6 w-6" />
      </div>
    </div>
  );
}

export function StockShell({ query, summary, children }: { query: StockQuery; summary: Summary; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(query);
  const [held, setHeld] = useState(summary?.facets ?? null);
  if (summary && summary.facets !== held) setHeld(summary.facets); // adjusting state during render, not an effect
  useEffect(() => rememberList(query), [query]); // so the car page can link back to this list

  const navigate: Stock["navigate"] = (next, { scroll = false } = {}) =>
    startTransition(() => {
      setOptimisticQuery(next);
      router.replace(stockHref(next), { scroll });
    });

  return (
    <StockContext value={{ query: optimisticQuery, summary, facets: summary ? summary.facets : held, pending, navigate }}>
      <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <h1 className="text-display font-semibold">Used cars</h1>
        <div className="lg:mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-card lg:bg-card lg:p-4">
            <StockFilters />
          </aside>
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <p aria-live="polite" data-testid="count" className="text-meta text-text-2">
                {summary && countLabel(summary.total)}
              </p>
              <SortControl className="hidden lg:flex" />
            </div>
            <div className="mt-4 lg:hidden">
              <SearchBox />
            </div>
            <div
              data-testid="sticky-bar"
              className="sticky top-0 z-20 -mx-4 mt-2 flex h-14 items-center justify-between border-t border-hairline bg-surface/80 px-4 backdrop-blur-[20px] backdrop-saturate-[1.8] sm:-mx-6 sm:px-6 lg:hidden reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none reduce-transparency:backdrop-saturate-100 contrast-more:border-text"
            >
              <FilterSheet />
              <SortControl className="flex" />
            </div>
            <AppliedFilters />
            <div aria-busy={pending} className={`transition-opacity duration-150 ease-out ${pending ? "opacity-60" : ""}`}>
              {children}
            </div>
          </div>
        </div>
      </main>
    </StockContext>
  );
}

export function EmptyState() {
  const { query, navigate } = useStock();
  return (
    <div className="py-16 text-center">
      <h2 className="text-heading font-semibold">No cars match these filters</h2>
      <p className="mt-2 text-body text-text-2">Try removing a filter.</p>
      <button type="button" onClick={() => navigate(clearFilters(query))} className={stateButton}>
        Clear all filters
      </button>
    </div>
  );
}
