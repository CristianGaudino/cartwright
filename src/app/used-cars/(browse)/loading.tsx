import { SkeletonCards } from "@/components/stock/SkeletonCards";

export default function Loading() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Used cars</h1>
      {/* Stands in for the count and Sort rows of StockShell. */}
      <div className="h-[84px] lg:h-12" />
      <div aria-hidden className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <SkeletonCards count={6} />
      </div>
    </main>
  );
}
