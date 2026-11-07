import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CallButton } from "@/components/InfoPage";
import { JsonLd } from "@/components/JsonLd";
import { MapBox } from "@/components/MapBox";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { dealerJsonLd, directionsUrl, formatHours, mapEmbedUrl } from "@/lib/dealer";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_FACTS_CONFIRMED, DEALER_PHONE, OPENING_HOURS, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: `Opening hours, address and phone for ${SITE_NAME} in Tralee, Co. Kerry.` };

const textLink = "inline-flex min-h-11 items-center self-start underline";

// Phone and links, no form: a general enquiry needs a new lead type (D-05). No "open now": the page is cached and that
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
      <p className="mt-2 max-w-[65ch] text-body">Call us or come and see us.</p>
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <CallButton>Call {DEALER_PHONE}</CallButton>
          <section className="flex flex-col gap-2">
            <h2 className="text-heading font-semibold">Address</h2>
            <address className="not-italic">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-heading font-semibold">Opening hours</h2>
            <dl>
              {OPENING_HOURS.map((h) => (
                <div key={h.day} className="flex justify-between gap-4 border-b border-hairline py-3">
                  <dt className="text-text-2">{h.day}</dt>
                  <dd className="text-right font-semibold">{formatHours(h)}</dd>
                </div>
              ))}
            </dl>
          </section>
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
