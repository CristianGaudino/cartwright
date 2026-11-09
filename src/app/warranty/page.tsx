import type { Metadata } from "next";
import { FeatureCard } from "@/components/Feature";
import { CallButton } from "@/components/InfoPage";
import { LayersIcon, ShieldCheckIcon } from "@/components/stock/icons";
import { pageMain, pageTitle, subTitle } from "@/components/ui";
import { DEALER_LOCATION, DEALER_PHONE, SITE_NAME, WARRANTY } from "@/lib/site";

export const metadata: Metadata = { title: "Warranty", description: `The warranty that comes with a used car from ${SITE_NAME} in ${DEALER_LOCATION}, and the longer cover you can add.` };

// PLACEHOLDER copy until the dealer confirms the warranty: what the warranties cover, for how long and what they cost.
export default function WarrantyPage() {
  return (
    <main className={pageMain}>
      {/* Laid out like the Service page: from 1024px the call button sits on the right, level with the title. */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div>
          <h1 className={pageTitle}>Warranty</h1>
          <p className="mt-2 max-w-[65ch] text-pretty text-body">Every car comes with cover, and you can add more.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
          <CallButton>Call {DEALER_PHONE}</CallButton>
        </div>
      </div>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className={subTitle}>What You Get</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FeatureCard badge={<ShieldCheckIcon className="size-6" />} title={WARRANTY.title} text={`${WARRANTY.text} It's included in the price of the car. Ask us for the full terms before you buy.`} />
          <FeatureCard badge={<LayersIcon className="size-6" />} title="Extended Warranty" text="Longer cover is available. Ask us what it covers and what it costs for the car you're looking at." />
        </ul>
      </section>
    </main>
  );
}
