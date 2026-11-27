import { card } from "@/components/ui";

// Static on purpose: no shimmer (UI-SPEC). Same box and text block heights as a ListingCard, so the cars arrive without a jump. `boxed` is
// a compare card's shape instead: the make and name, then `figures` rows the height of its figure rows (py-3 and a 1px rule each). From md
// it spans three rows of the grid, gaps included, as a compare card does.
export function SkeletonCards({ count, boxed = false, figures = 0 }: { count: number; boxed?: boolean; figures?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-skeleton className={`overflow-hidden ${card} ${boxed ? "md:row-span-3 md:grid md:grid-rows-subgrid" : ""}`}>
      <div className="aspect-[4/3] bg-photo-bg" />
      {boxed ? (
        <div className="flex flex-col gap-0.5 p-4 pb-2">
          <div className="my-[3px] h-[14px] w-24 rounded-control bg-photo-bg" />
          <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 p-4">
          <div className="my-[3px] h-[18px] w-24 rounded-control bg-photo-bg" />
          <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
          <div className="my-[3px] h-[14px] w-1/2 rounded-control bg-photo-bg" />
        </div>
      )}
      {figures > 0 && (
        <div className="flex flex-col divide-y divide-hairline px-4 pb-2">
          {Array.from({ length: figures }, (_, r) => (
            <div key={r} className="py-3">
              <div className="my-[3px] h-[18px] rounded-control bg-photo-bg" />
            </div>
          ))}
        </div>
      )}
    </div>
  ));
}
