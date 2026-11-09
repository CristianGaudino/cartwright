import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { pageMain } from "@/components/ui";

export default function Loading() {
  return (
    <main className={pageMain}>
      <h1 className="text-display font-semibold">Used Cars</h1>
      {/* Stands in for the count and Sort rows of StockShell. */}
      <div className="h-[84px] lg:h-12" />
      <div aria-hidden className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <SkeletonCards count={6} />
      </div>
    </main>
  );
}
