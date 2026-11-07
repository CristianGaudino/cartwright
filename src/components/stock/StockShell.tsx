"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useOptimistic, useState, useTransition } from "react";
import { countLabel } from "@/lib/stock/format";
import { clearFilters, stockHref } from "@/lib/stock/query";
import { SORT_KEYS } from "@/lib/stock/types";
import type { Facets, SortKey, StockQuery } from "@/lib/stock/types";
import { AppliedFilters } from "./AppliedFilters";
import { rememberList } from "./BackToCars";
import { FilterSheet } from "./FilterSheet";
import { SelectBox } from "@/components/SelectBox";
import { GridIcon, ListIcon } from "./icons";
import { SearchBox, StockFilters } from "./StockFilters";
import { stateButton } from "./StockError";
import { setView, useView } from "./view";
import { slash } from "@/components/ui";

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
      <SelectBox
        id={id}
        value={query.sort}
        onChange={(e) => {
          const sort = SORT_KEYS.find((k) => k === e.target.value);
          if (sort) navigate({ ...query, sort, page: 1 });
        }}
        className="pl-3"
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </SelectBox>
    </div>
  );
}

// Two icon buttons, the active one red, as in the mockup. From 1024px only, with the sidebar: below that the cards are always a grid.
function ViewToggle() {
  const view = useView();
  const btn = (v: "grid" | "list", label: string, Icon: typeof GridIcon) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`flex size-12 items-center justify-center transition-colors ${view === v ? "bg-accent text-white" : "hover:bg-hairline"}`}
    >
      <Icon className="size-6" />
    </button>
  );
  return (
    <div role="group" aria-label="Layout" className="flex overflow-hidden rounded-control border border-control">
      {btn("grid", "Grid view", GridIcon)}
      {btn("list", "List view", ListIcon)}
    </div>
  );
}

export function StockShell({ query, summary, children }: { query: StockQuery; summary: Summary; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const view = useView();
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
        <p className={`text-body ${slash}`}>Our stock</p>
        <h1 className="mt-1 text-display font-semibold lg:text-hero">Quality used cars</h1>
        <p className="mt-2 max-w-[65ch] text-body text-text-2">Browse our current stock of used cars, all carefully selected.</p>
        <div className="mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-card lg:border lg:border-hairline lg:bg-card lg:p-4">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-hairline pb-4">
              <h2 className="text-heading font-semibold">Filter &amp; refine</h2>
              <button type="button" onClick={() => navigate(clearFilters(optimisticQuery))} className="min-h-11 text-meta font-semibold underline">
                Clear all
              </button>
            </div>
            <StockFilters />
          </aside>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-4">
              <p aria-live="polite" data-testid="count" className="text-heading font-semibold">
                {summary && countLabel(summary.total)}
              </p>
              <div className="hidden items-center gap-3 lg:flex">
                <SortControl className="flex" />
                <ViewToggle />
              </div>
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
            <div data-view={view} aria-busy={pending} className={`transition-opacity duration-150 ease-out ${pending ? "opacity-60" : ""}`}>
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
      <Link href="/find-a-car" className="mx-auto flex min-h-11 w-fit items-center text-body underline">
        Cannot find it? Ask us to find it for you.
      </Link>
      <button type="button" onClick={() => navigate(clearFilters(query))} className={stateButton}>
        Clear all filters
      </button>
    </div>
  );
}
