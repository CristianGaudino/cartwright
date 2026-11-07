import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { DEALER_FACTS_CONFIRMED, DEALER_PHONE, DEALER_TEL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use", description: `The terms for using the ${SITE_NAME} website.` };

// Draft copy (UI-SPEC); the dealer's own terms replace it.
export default function TermsPage() {
  return (
    <InfoPage placeholder title="Terms of use">
      {!DEALER_FACTS_CONFIRMED && <p className="rounded-card border border-hairline bg-card p-4">This is a draft. The dealer&apos;s own terms replace it.</p>}
      <InfoSection title="Using this site">
        <p>You can browse this site freely. Do not use it to send us anything that is not true or not yours.</p>
      </InfoSection>
      <InfoSection title="Cars and prices">
        <p>Cars and prices are shown as supplied by us and can change. Call to check a car is still available before you travel.</p>
      </InfoSection>
      <InfoSection title="Finance figures">
        <p>Finance figures are representative only. They are not an offer of credit. Rates and terms depend on your circumstances and are confirmed by the dealer.</p>
      </InfoSection>
      <InfoSection title="Reviews">
        <p>Reviews come from Google and are shown as written.</p>
      </InfoSection>
      <InfoSection title="Contact">
        <p>
          Call us on{" "}
          <a href={`tel:${DEALER_TEL}`} className="font-semibold underline">
            {DEALER_PHONE}
          </a>{" "}
          with any question about these terms.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
