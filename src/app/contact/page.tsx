import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CallButton, InfoSection } from "@/components/InfoPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { JsonLd } from "@/components/JsonLd";
import { MapBox } from "@/components/MapBox";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { dealerJsonLd, directionsUrl, formatHours, mapEmbedUrl } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_EMAIL, DEALER_FACTS_CONFIRMED, DEALER_PHONE, OPENING_HOURS, SITE_NAME } from "@/lib/site";
import { textLink as link } from "@/components/ui";

export const metadata: Metadata = { title: "Contact", description: `Opening hours, address and phone for ${SITE_NAME} in Tralee, Co. Kerry.` };

const textLink = `${link} self-start`;

// Phone, a message form and, once confirmed, the email. No "open now": the page is cached and that
// needs the visitor's clock.
export default async function ContactPage() {
  // The place ID and the reviews provider come from env at request time.
  await connection();
  const address = [DEALER_ADDRESS.street, DEALER_ADDRESS.town, DEALER_ADDRESS.county, DEALER_ADDRESS.eircode];
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <JsonLd data={dealerJsonLd(await getReviews())} />
      {!DEALER_FACTS_CONFIRMED && (
        <div className="mb-4 flex">
          <PlaceholderPill>Placeholder details</PlaceholderPill>
        </div>
      )}
      <h1 className="text-display font-semibold">Contact</h1>
      <p className="mt-2 max-w-[65ch] text-body">Call or email us, or come and see us.</p>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <CallButton>Call {DEALER_PHONE}</CallButton>
          {/* A placeholder address that does not forward yet (#54): shown only once the dealer confirms. */}
          {DEALER_FACTS_CONFIRMED && (
            <p className="text-body">
              Or email{" "}
              <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
                {DEALER_EMAIL}
              </a>
            </p>
          )}
          <InfoSection title="Send us a message">
            <LeadPageForm type="general" submitLabel="Send message" success={{ heading: "Thanks, we have your message.", body: "We will get back to you." }} />
          </InfoSection>
          <InfoSection title="Address">
            <address className="not-italic">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </InfoSection>
          <InfoSection title="Opening hours">
            <dl>
              {OPENING_HOURS.map((h) => (
                <div key={h.day} className="flex justify-between gap-4 border-b border-hairline py-3">
                  <dt className="text-text-2">{h.day}</dt>
                  <dd className="text-right font-semibold">{formatHours(h)}</dd>
                </div>
              ))}
            </dl>
          </InfoSection>
          <div className="flex flex-col">
            <Link href="/find-a-car" className={textLink}>
              Ask us to find a car
            </Link>
            <Link href="/sell-your-car" className={textLink}>
              Sell your car
            </Link>
          </div>
        </div>
        <MapBox embedUrl={mapEmbedUrl()} directionsUrl={directionsUrl(process.env.GOOGLE_PLACE_ID)} title={`Map of ${SITE_NAME}, Tralee`} address={address} />
      </div>
    </main>
  );
}
