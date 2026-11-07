import type { Metadata } from "next";
import { CallButton, InfoPage, InfoSection } from "@/components/InfoPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { CheckIcon } from "@/components/stock/icons";
import { DEALER_PHONE, SERVICES, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Service", description: `Servicing and repairs at ${SITE_NAME} in Tralee, Co. Kerry.` };

// Booking is by phone, or a message the dealer answers.
export default function ServicePage() {
  return (
    <InfoPage placeholder title="Service" intro="Tell us what your car needs and we will tell you what we can do.">
      <InfoSection title="What we do">
        <ul className="flex flex-col gap-2">
          {SERVICES.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </InfoSection>
      <InfoSection title="Book your car in">
        <p>Call us and we will find a time.</p>
        <div className="mt-2 flex flex-col gap-2">
          <CallButton>Call to book</CallButton>
          <p className="text-meta text-text-2">{DEALER_PHONE}</p>
        </div>
      </InfoSection>
      <InfoSection title="Or send us a message">
        <LeadPageForm type="general" submitLabel="Send message" success={{ heading: "Thanks, we have your message.", body: "We will get back to you." }} />
      </InfoSection>
    </InfoPage>
  );
}
