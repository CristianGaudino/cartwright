import type { Metadata } from "next";
import { connection } from "next/server";
import { CallButton } from "@/components/InfoPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { JsonLd } from "@/components/JsonLd";
import { MapBox } from "@/components/MapBox";
import { OpeningHours } from "@/components/OpeningHours";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { dealerDirectionsUrl, dealerJsonLd, mapEmbedUrl } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { DEALER_EMAIL, DEALER_FACTS_CONFIRMED, DEALER_PHONE, SITE_NAME } from "@/lib/site";
import { card, pageMain, pageTitle, subTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Contact", description: `Opening hours, map and phone for ${SITE_NAME} in Tralee, Co. Kerry.` };

// Two columns from 1024px, level at the top: the ways to reach us and the message form on the left, the map with the opening hours
// under it on the right. The address is in the footer, so it is not repeated here.
export default async function ContactPage() {
  // The place ID and the reviews provider come from env at request time.
  await connection();
  return (
    <main className={pageMain}>
      <JsonLd data={dealerJsonLd(await getReviews())} />
      <h1 className={pageTitle}>Contact</h1>
      <p className="mt-2 max-w-[65ch] text-body">Call or message us, or come and see us.</p>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <CallButton>Call {DEALER_PHONE}</CallButton>
            <WhatsAppButton />
          </div>
          {/* A placeholder address that does not forward yet (#54): shown only once the dealer confirms. */}
          {DEALER_FACTS_CONFIRMED && (
            <p className="text-body">
              Or email{" "}
              <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
                {DEALER_EMAIL}
              </a>
            </p>
          )}
          <section data-wells className={`flex flex-col gap-4 ${card} p-5 sm:p-6`}>
            <h2 className={subTitle}>Send Us a Message</h2>
            <LeadPageForm type="general" submitLabel="Send Message" success={{ heading: "Thanks, we have your message.", body: "We will get back to you." }} />
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <MapBox embedUrl={mapEmbedUrl()} directionsUrl={dealerDirectionsUrl()} title={`Map of ${SITE_NAME}, Tralee`} />
          <OpeningHours />
        </div>
      </div>
    </main>
  );
}
