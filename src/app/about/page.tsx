import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "About us", description: `${SITE_NAME} is a used car dealer in Tralee, Co. Kerry.` };

// The dealer's own story replaces Who we are (D-09): no history, awards, years trading or staff names are invented.
export default function AboutPage() {
  return (
    <InfoPage placeholder title="About Us">
      {/* Decorative: a detail of one of our cars, so it has no text of its own. */}
      <Image src="/brand/about.webp" width={1200} height={900} alt="" className="aspect-[16/9] w-full rounded-card object-cover" />
      <InfoSection title="Who we are">
        <p>We are a used car dealer in Tralee, Co. Kerry. Call in, look around and ask us anything.</p>
      </InfoSection>
      <InfoSection title="Visit us">
        <p>You can find us in Tralee.</p>
        <Link href="/contact" className="inline-flex min-h-11 items-center self-start underline">
          Opening Hours and Directions
        </Link>
      </InfoSection>
    </InfoPage>
  );
}
