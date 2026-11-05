import type { Metadata } from "next";
import { StockResults } from "@/components/stock/StockResults";
import { stock } from "@/lib/stock";
import { countLabel } from "@/lib/stock/format";
import { parseStockQuery } from "@/lib/stock/query";

// shortcut: noindex while the demo uses the dealer's data (D-04), remove when the client feed replaces it.
export const metadata: Metadata = { title: "Used cars", robots: { index: false } };

export default async function UsedCarsPage({ searchParams }: PageProps<"/used-cars">) {
  const query = parseStockQuery(await searchParams);
  const result = await stock.query(query);
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Used cars</h1>
      <p data-testid="count" className="text-meta text-text-2">{countLabel(result.total)}</p>
      <StockResults result={result} query={query} />
    </main>
  );
}
