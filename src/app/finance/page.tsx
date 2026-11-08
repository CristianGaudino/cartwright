import type { Metadata } from "next";
import { connection } from "next/server";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { slash } from "@/components/ui";
import { financeable } from "@/lib/finance/payment";
import { queryAllOrNull } from "@/lib/stock";
import { carSummary } from "@/lib/stock/format";

export const metadata: Metadata = { title: "Car finance estimator", description: "Estimate a monthly payment on a used car, then send us your details and we will contact you with the real amounts. Carright, Tralee, Co. Kerry." };

export default async function FinancePage() {
  await connection();
  // A stock failure only hides the car picker: the estimator still works on a typed price.
  const all = await queryAllOrNull();
  const cars = all?.cars.filter((c) => financeable(c.priceEur)).map((c) => ({ ...carSummary(c), priceEur: c.priceEur }));
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={`text-display font-bold lg:text-hero ${slash}`}>Finance Estimator</h1>
      <p className="mt-2 max-w-[65ch] text-body">Pick a car, or type a price, for an estimate of the monthly payment. It is the start of the process, not an approval.</p>
      <div className="mt-6 flex flex-col gap-4">
        <FinanceCalculator cars={cars} />
      </div>
    </main>
  );
}
