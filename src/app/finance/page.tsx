import type { Metadata } from "next";
import { FeatureCard, FeatureSection } from "@/components/Feature";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { CheckIcon } from "@/components/stock/icons";
import { pageMain, pageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Car Finance Estimator",
  description: "Estimate a monthly payment on a used car. It's the start of the process: choose a car and send an enquiry and we'll contact you with the real amounts. Carright, Tralee, Co. Kerry.",
};

const POINTS = [
  { title: "An Estimate, Not an Approval", text: "The figure is worked out at an example rate. It shows roughly what a payment could be." },
  { title: "Your Circumstances Matter", text: "What you're offered depends on things such as your age, income and credit history, and is decided by the lender." },
  { title: "We Come Back With Real Amounts", text: "Choose a car, send an enquiry, and we'll contact you with the actual figures and the next steps." },
];

export default function FinancePage() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>Finance Estimator</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">Type a price and choose a deposit and a term to see roughly what a monthly payment could be.</p>
      <div className="mt-6 flex flex-col gap-4">
        <FinanceCalculator />
      </div>
      <div className="mt-12">
        <FeatureSection title="Good to Know">
          {POINTS.map((p) => (
            <FeatureCard key={p.title} badge={<CheckIcon className="size-5" />} {...p} />
          ))}
        </FeatureSection>
      </div>
    </main>
  );
}
