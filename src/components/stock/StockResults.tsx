import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { stockHref } from "@/lib/stock/query";
import type { StockQuery, StockResult } from "@/lib/stock/types";
import { ListingCard } from "./ListingCard";
import { EmptyState } from "./StockShell";

// One segment of the pager: a hairline-divided button, the current page filled.
const seg = "flex min-h-11 min-w-11 items-center justify-center gap-1 px-3 text-meta font-semibold tabular-nums transition-colors";
const segLink = `${seg} hover:bg-hairline active:bg-hairline`;
const segOff = `${seg} pointer-events-none text-text-2 opacity-40`;

// The pages to show: the first, the last, and the ones either side of this one, with a gap marked by null.
function pagesToShow(page: number, count: number): (number | null)[] {
  const keep = [...new Set([1, page - 1, page, page + 1, count])].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  return keep.flatMap((p, i) => (i > 0 && p - keep[i - 1] > 1 ? [null, p] : [p]));
}

export function StockResults({ result, query }: { result: StockResult; query: StockQuery }) {
  const { cars, page, pageCount } = result;
  const first = (page - 1) * query.pageSize + 1;
  if (result.total === 0) return <EmptyState />;
  return (
    <>
      <div data-grid className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cars.map((car, i) => (
          <ListingCard key={car.id} car={car} priority={i < 2} />
        ))}
      </div>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex flex-col items-center gap-3">
          <ul className="inline-flex divide-x divide-control overflow-hidden rounded-control border border-control bg-card">
            <li>
              {page > 1 ? (
                <Link replace href={stockHref({ ...query, page: page - 1 })} aria-label="Previous page" className={segLink}>
                  <ChevronLeftIcon className="size-5" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              ) : (
                <span aria-hidden="true" className={segOff}>
                  <ChevronLeftIcon className="size-5" />
                  <span className="hidden sm:inline">Previous</span>
                </span>
              )}
            </li>
            {/* A phone has room for "Page 2 of 5"; from 640px the numbers show. */}
            <li className="flex items-center px-4 text-meta sm:hidden">
              Page {page} of {pageCount}
            </li>
            {pagesToShow(page, pageCount).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} aria-hidden="true" className={`${seg} hidden text-text-2 sm:flex`}>
                  …
                </li>
              ) : (
                <li key={p} className="hidden sm:block">
                  {p === page ? (
                    <span aria-current="page" aria-label={`Page ${p}, current page`} className={`${seg} bg-accent text-white`}>
                      {p}
                    </span>
                  ) : (
                    <Link replace href={stockHref({ ...query, page: p })} aria-label={`Page ${p}`} className={segLink}>
                      {p}
                    </Link>
                  )}
                </li>
              ),
            )}
            <li>
              {page < pageCount ? (
                <Link replace href={stockHref({ ...query, page: page + 1 })} aria-label="Next page" className={segLink}>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="size-5" />
                </Link>
              ) : (
                <span aria-hidden="true" className={segOff}>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="size-5" />
                </span>
              )}
            </li>
          </ul>
          <p className="text-meta text-text-2">
            Showing {first} to {first + cars.length - 1} of {result.total} cars
          </p>
        </nav>
      )}
    </>
  );
}
