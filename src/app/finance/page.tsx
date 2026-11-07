import type { Metadata } from "next";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";

export const metadata: Metadata = { title: "Car finance calculator" };

export default function FinancePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Finance</h1>
      <p className="mt-2 max-w-[65ch] text-body">Work out a monthly payment, then send us an application.</p>
      <div className="mt-6 flex max-w-[640px] flex-col gap-4">
        <FinanceCalculator />
      </div>
    </main>
  );
}
