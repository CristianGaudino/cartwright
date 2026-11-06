// Static on purpose: no shimmer (UI-SPEC). Same box and text block heights as a ListingCard, so the cars arrive without a jump.
export default function Loading() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Used cars</h1>
      {/* Stands in for the count and Sort rows of StockShell. */}
      <div className="h-[84px] lg:h-12" />
      <div aria-hidden className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} data-skeleton className="overflow-hidden rounded-card border border-hairline bg-card">
            <div className="aspect-[4/3] bg-photo-bg" />
            <div className="flex flex-col gap-1 p-4">
              <div className="my-[3px] h-[18px] w-24 rounded-control bg-photo-bg" />
              <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
              <div className="my-[3px] h-[14px] w-1/2 rounded-control bg-photo-bg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
