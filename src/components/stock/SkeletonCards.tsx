import { card } from "@/components/ui";

// Static on purpose: no shimmer (UI-SPEC). Same box and text block heights as a ListingCard, so the cars arrive without a jump.
export function SkeletonCards({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-skeleton className={`overflow-hidden ${card}`}>
      <div className="aspect-[4/3] bg-photo-bg" />
      <div className="flex flex-col gap-1 p-4">
        <div className="my-[3px] h-[18px] w-24 rounded-control bg-photo-bg" />
        <div className="my-[3px] h-[18px] w-3/4 rounded-control bg-photo-bg" />
        <div className="my-[3px] h-[14px] w-1/2 rounded-control bg-photo-bg" />
      </div>
    </div>
  ));
}
