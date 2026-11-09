import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { pageMain, pageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Car Finance Estimator",
  description: `Estimate a monthly payment on a used car. It's the start of the process: choose a car and send an enquiry. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

export default function FinancePage() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>Finance Estimator</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">Type a price and choose a deposit and a term to see roughly what a monthly payment could be.</p>
      <div className="mt-6 flex flex-col gap-4">
        <FinanceCalculator />
      </div>
    </main>
  );
}
