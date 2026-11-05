import type { Metadata } from "next";
import { StockResults } from "@/components/stock/StockResults";
import { StockShell } from "@/components/stock/StockShell";
import { stock } from "@/lib/stock";
import { parseStockQuery } from "@/lib/stock/query";

// shortcut: noindex while the demo uses the dealer's data (D-04), remove when the client feed replaces it.
export const metadata: Metadata = { title: "Used cars", robots: { index: false } };

export default async function UsedCarsPage({ searchParams }: PageProps<"/used-cars">) {
  const query = parseStockQuery(await searchParams);
  const result = await stock.query(query);
  return (
    <StockShell query={query} summary={{ total: result.total, facets: result.facets }}>
      <StockResults result={result} query={query} />
    </StockShell>
  );
}
