import type { Metadata } from "next";
import { CallButton, InfoPage, InfoSection } from "@/components/InfoPage";
import { DEALER_PHONE, SITE_NAME, WARRANTY } from "@/lib/site";

export const metadata: Metadata = { title: "Warranty", description: `The warranty that comes with a used car from ${SITE_NAME} in Tralee, Co. Kerry, and the longer cover you can add.` };

// PLACEHOLDER (flagged by InfoPage until DEALER_FACTS_CONFIRMED): the dealer writes what the warranties cover, for how long and what they cost.
export default function WarrantyPage() {
  return (
    <InfoPage title="Warranty" intro="Every car comes with cover, and you can add more.">
      <InfoSection title={WARRANTY.title}>
        <p>{WARRANTY.text}</p>
        <p>It is included in the price of the car. Ask us for the full terms before you buy.</p>
      </InfoSection>
      <InfoSection title="Extended Warranty">
        <p>Longer cover is available. Ask us what it covers and what it costs for the car you are looking at.</p>
      </InfoSection>
      <InfoSection title="Ask Us About It">
        <div className="flex flex-col gap-2">
          <CallButton>Call Us</CallButton>
          <p className="text-meta text-text-2">{DEALER_PHONE}</p>
        </div>
      </InfoSection>
    </InfoPage>
  );
}
