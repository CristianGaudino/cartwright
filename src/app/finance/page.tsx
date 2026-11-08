import type { Metadata } from "next";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { CheckIcon } from "@/components/stock/icons";
import { pageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Car finance estimator",
  description: "Estimate a monthly payment on a used car. It is the start of the process: choose a car and send an enquiry and we will contact you with the real amounts. Carright, Tralee, Co. Kerry.",
};

const POINTS = [
  { title: "An estimate, not an approval", text: "The figure is worked out at an example rate. It shows roughly what a payment could be." },
  { title: "Your circumstances matter", text: "What you are offered depends on things such as your age, income and credit history, and is decided by the lender." },
  { title: "We come back with real amounts", text: "Choose a car, send an enquiry, and we will contact you with the actual figures and the next steps." },
];

export default function FinancePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={pageTitle}>Finance Estimator</h1>
      <p className="mt-2 max-w-[65ch] text-body">Type a price and choose a deposit and a term to see roughly what a monthly payment could be.</p>
      <div className="mt-6 flex flex-col gap-4">
        <FinanceCalculator />
      </div>
      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-heading font-semibold">Good to Know</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="flex items-start gap-4 rounded-card border border-hairline bg-card p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
                <CheckIcon className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-body font-semibold">{p.title}</span>
                <span className="text-meta text-text-2">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
