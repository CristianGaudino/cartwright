import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { DEALER_FACTS_CONFIRMED, SITE_NAME } from "@/lib/site";
import { PhoneLink } from "@/components/PhoneLink";
import { card } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of use", description: `The terms for using the ${SITE_NAME} website.` };

// Draft copy (UI-SPEC); the dealer's own terms replace it.
export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use">
      {!DEALER_FACTS_CONFIRMED && <p className={`${card} p-4`}>This is a draft. The dealer&apos;s own terms replace it.</p>}
      <InfoSection title="Using this site">
        <p>You can browse this site freely. Don&apos;t use it to send us anything that isn&apos;t true or isn&apos;t yours.</p>
      </InfoSection>
      <InfoSection title="Cars and prices">
        <p>Cars and prices are shown as supplied by us and can change. Call to check a car is still available before you travel.</p>
      </InfoSection>
      <InfoSection title="Finance figures">
        <p>Finance figures are estimates only. They aren&apos;t an approval or an offer of credit. Finance is provided through a lender, subject to status. The rate and amount you&apos;re offered depend on your circumstances and are confirmed by the lender.</p>
      </InfoSection>
      <InfoSection title="Reviews">
        <p>Reviews come from Google and are shown as written.</p>
      </InfoSection>
      <InfoSection title="Contact">
        <p>
          Call us on{" "}
          <PhoneLink />{" "}
          with any question about these terms.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
