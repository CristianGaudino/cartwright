import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StockResults } from "@/components/stock/StockResults";
import { StockError } from "@/components/stock/StockError";
import { StockShell } from "@/components/stock/StockShell";
import { indexable } from "@/lib/site";
import { stock } from "@/lib/stock";
import { parseStockQuery, stockHref } from "@/lib/stock/query";

// Filtered and sorted lists duplicate the landing pages, so only the bare list is indexable.
export async function generateMetadata({ searchParams }: PageProps<"/used-cars">): Promise<Metadata> {
  const bare = Object.keys(await searchParams).length === 0;
  return { title: "Used Cars", description: "Browse the used cars in stock at Carright in Tralee, Co. Kerry. Filter by make, model, price, year and more.", alternates: { canonical: "/used-cars" }, robots: { index: indexable() && bare } };
}

export default async function UsedCarsPage({ searchParams }: PageProps<"/used-cars">) {
  const query = parseStockQuery(await searchParams);
  // No error.tsx: it would replace the whole segment and take Sort and the filters with it.
  // Log a constant message and the error name only: never the query, params or URL (T-01-29), they can hold search text.
  const result = await stock.query(query).catch((e: unknown) => {
    console.error("stock.query failed", e instanceof Error ? e.name : typeof e);
    return null;
  });
  // Constant /used-cars path plus serialised params, never a user URL (T-01-14).
  if (result && result.pageCount > 0 && query.page > result.pageCount) redirect(stockHref({ ...query, page: result.pageCount }));
  return (
    <StockShell query={query} summary={result && { total: result.total, facets: result.facets }}>
      {result ? <StockResults result={result} query={query} /> : <StockError />}
    </StockShell>
  );
}
