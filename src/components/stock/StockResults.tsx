import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { stockHref } from "@/lib/stock/query";
import type { StockQuery, StockResult } from "@/lib/stock/types";
import { ListingCard } from "./ListingCard";
import { EmptyState } from "./StockShell";

const cell = "inline-flex size-11 items-center justify-center rounded-control border border-hairline bg-card font-semibold tabular-nums transition-colors hover:bg-hairline active:scale-[0.97] motion-reduce:active:scale-100";

// The pages to show: the first, the last, and the ones either side of this one, with a gap marked by null.
function pagesToShow(page: number, count: number): (number | null)[] {
  const keep = [...new Set([1, page - 1, page, page + 1, count])].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  return keep.flatMap((p, i) => (i > 0 && p - keep[i - 1] > 1 ? [null, p] : [p]));
}

export function StockResults({ result, query }: { result: StockResult; query: StockQuery }) {
  const { cars, page, pageCount } = result;
  if (result.total === 0) return <EmptyState />;
  return (
    <>
      <div data-grid className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cars.map((car, i) => (
          <ListingCard key={car.id} car={car} priority={i < 2} />
        ))}
      </div>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2 text-meta">
          {page > 1 ? (
            <Link replace href={stockHref({ ...query, page: page - 1 })} aria-label="Previous page" className={cell}>
              <ChevronLeftIcon className="size-5" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} pointer-events-none opacity-30`}>
              <ChevronLeftIcon className="size-5" />
            </span>
          )}
          {/* A phone has room for "Page 2 of 5"; from 640px the numbers show. */}
          <p className="px-3 sm:hidden">
            Page {page} of {pageCount}
          </p>
          <ul className="hidden items-center gap-2 sm:flex">
            {pagesToShow(page, pageCount).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-text-2">
                  …
                </li>
              ) : (
                <li key={p}>
                  {p === page ? (
                    <span aria-current="page" aria-label={`Page ${p}, current page`} className={`${cell} border-accent bg-accent text-white hover:bg-accent`}>
                      {p}
                    </span>
                  ) : (
                    <Link replace href={stockHref({ ...query, page: p })} aria-label={`Page ${p}`} className={cell}>
                      {p}
                    </Link>
                  )}
                </li>
              ),
            )}
          </ul>
          {page < pageCount ? (
            <Link replace href={stockHref({ ...query, page: page + 1 })} aria-label="Next page" className={cell}>
              <ChevronRightIcon className="size-5" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} pointer-events-none opacity-30`}>
              <ChevronRightIcon className="size-5" />
            </span>
          )}
        </nav>
      )}
    </>
  );
}
