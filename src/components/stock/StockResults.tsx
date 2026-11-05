import Link from "next/link";
import { stockHref } from "@/lib/stock/query";
import type { StockQuery, StockResult } from "@/lib/stock/types";
import { ListingCard } from "./ListingCard";

const pageLink = "inline-flex min-h-11 items-center rounded-control px-3 font-semibold active:scale-[0.97] motion-reduce:active:scale-100";

export function StockResults({ result, query }: { result: StockResult; query: StockQuery }) {
  const { cars, page, pageCount } = result;
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cars.map((car, i) => (
          <ListingCard key={car.id} car={car} priority={i < 2} />
        ))}
      </div>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4 text-meta">
          {page > 1 ? (
            <Link replace href={stockHref({ ...query, page: page - 1 })} className={pageLink}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <p className="flex items-center gap-2">
            Page <span className="rounded-full bg-accent px-3 py-1 font-semibold text-white">{page}</span> of {pageCount}
          </p>
          {page < pageCount ? (
            <Link replace href={stockHref({ ...query, page: page + 1 })} className={pageLink}>
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
