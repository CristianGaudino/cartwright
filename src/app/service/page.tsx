import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { FeatureCard, FeatureSection } from "@/components/Feature";
import { ServiceMenu } from "@/components/service/ServiceMenu";
import { ShieldCheckIcon, SwapIcon, CheckIcon } from "@/components/stock/icons";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { pageMain, pageTitle, subTitle } from "@/components/ui";
import { DEALER_LOCATION, DEALER_PHONE, SERVICES, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Service", description: `Servicing, repairs and tyres at ${SITE_NAME} in ${DEALER_LOCATION}. Call us to book your car in.` };

// PLACEHOLDER copy: the dealer confirms what is offered (DEALER_FACTS_CONFIRMED). What is offered lives in SERVICES in site.ts.
const WHY = [
  { Icon: CheckIcon, title: "Straight Answers", text: "We tell you what your car needs now and what can wait." },
  { Icon: ShieldCheckIcon, title: "Agreed Before We Start", text: "You know what the work involves and what it will cost before we begin." },
  { Icon: SwapIcon, title: "Booked In Properly", text: "Call or message us and we find a time that suits you." },
];

export default function ServicePage() {
  return (
    <main className={pageMain}>
      {/* From 1024px the call and WhatsApp buttons sit on the right, level with the title, like the stock page's controls. */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div>
          <h1 className={pageTitle}>Service</h1>
          <p className="mt-2 max-w-[65ch] text-pretty text-body">Keep your car running well. Call us to book it in, or choose a service to find out more.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
          <CallButton>Call {DEALER_PHONE}</CallButton>
          <WhatsAppButton />
        </div>
      </div>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className={subTitle}>What We Do</h2>
        <ServiceMenu services={SERVICES} />
      </section>

      <div className="mt-12">
        <FeatureSection title="Why Choose Us">
          {WHY.map(({ Icon, ...f }) => (
            <FeatureCard key={f.title} badge={<Icon className="size-6" />} {...f} />
          ))}
        </FeatureSection>
      </div>
    </main>
  );
}
