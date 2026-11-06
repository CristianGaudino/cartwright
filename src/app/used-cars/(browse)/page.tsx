import type { Metadata } from "next";
import { StockResults } from "@/components/stock/StockResults";
import { StockError, StockShell } from "@/components/stock/StockShell";
import { stock } from "@/lib/stock";
import { parseStockQuery } from "@/lib/stock/query";

// shortcut: noindex while the demo uses the dealer's data (D-04), remove when the client feed replaces it.
export const metadata: Metadata = { title: "Used cars", robots: { index: false } };

export default async function UsedCarsPage({ searchParams }: PageProps<"/used-cars">) {
  const query = parseStockQuery(await searchParams);
  // No error.tsx: it would replace the whole segment and take Sort and the filters with it. Nothing is logged (T-01-29).
  const result = await stock.query(query).catch(() => null);
  return (
    <StockShell query={query} summary={result && { total: result.total, facets: result.facets }}>
      {result ? <StockResults result={result} query={query} /> : <StockError />}
    </StockShell>
  );
}
