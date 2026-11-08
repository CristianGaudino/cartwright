import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { ServiceMenu } from "@/components/service/ServiceMenu";
import { ShieldCheckIcon, SwapIcon, CheckIcon } from "@/components/stock/icons";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { pageTitle } from "@/components/ui";
import { DEALER_PHONE, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Service", description: `Servicing, repairs and tyres at ${SITE_NAME} in Tralee, Co. Kerry. Call us to book your car in.` };

// PLACEHOLDER copy: the dealer confirms what is offered (DEALER_FACTS_CONFIRMED). The types under each service are examples.
const SERVICES = [
  { name: "Servicing", blurb: "Regular servicing keeps your car reliable.", types: ["Interim service", "Full service", "Oil and filter change", "Pre-NCT check"] },
  { name: "Repairs", blurb: "Faults found and fixed, with the cost agreed first.", types: ["Brakes and suspension", "Engine and gearbox", "Diagnostics and warning lights", "Clutch and exhaust"] },
  { name: "Tyres", blurb: "The right tyres, fitted and checked.", types: ["New tyres fitted", "Puncture repair", "Wheel balancing", "Wheel alignment"] },
];
const WHY = [
  { Icon: CheckIcon, title: "Straight Answers", text: "We tell you what your car needs now and what can wait." },
  { Icon: ShieldCheckIcon, title: "Agreed Before We Start", text: "You know what the work involves and what it will cost before we begin." },
  { Icon: SwapIcon, title: "Booked In Properly", text: "Call or message us and we find a time that suits you." },
];

export default function ServicePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={pageTitle}>Service</h1>
      <p className="mt-2 max-w-[65ch] text-body">Keep your car running well. Call us to book it in, or choose a service to find out more.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <CallButton>Call {DEALER_PHONE}</CallButton>
        <WhatsAppButton />
      </div>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-heading font-semibold">What We Do</h2>
        <ServiceMenu services={SERVICES} />
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-heading font-semibold">Why Choose Us</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {WHY.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 rounded-card border border-hairline bg-card p-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
                <Icon className="size-6" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-body font-semibold">{title}</span>
                <span className="text-meta text-text-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
