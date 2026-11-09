import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { DEALER_EMAIL, DEALER_LOCATION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use", description: `The terms for using the ${SITE_NAME} website.` };

// The dealer's terms for the website. They do not touch a buyer's rights under the Sale of Goods and Supply of Services Act 1980 or the
// Consumer Rights Act 2022, which cannot be taken away, and say so. The terms of the sale of a car itself are in the sales contract.
export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" intro={`Last updated November 2026. By using this website you agree to these terms. If you don't agree, please don't use it.`}>
      <InfoSection title="Who We Are">
        <p>
          This website is run by {SITE_NAME}, a used car dealer in {DEALER_LOCATION}. In these terms, &quot;we&quot; and &quot;us&quot; mean {SITE_NAME}, and &quot;you&quot; means anyone using the website.
        </p>
      </InfoSection>
      <InfoSection title="Using the Site">
        <p>You may browse the site and use its forms for your own, lawful purposes. You agree that you will not:</p>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          <li>send us anything that is untrue, or that belongs to someone else;</li>
          <li>use the site to harass, mislead or defraud anyone;</li>
          <li>copy the site&apos;s content in bulk, or use automated tools to collect it;</li>
          <li>try to interfere with the site, its security or the way it works.</li>
        </ul>
        <p>We may block access to anyone who breaks these terms.</p>
      </InfoSection>
      <InfoSection title="Cars and Prices">
        <p>
          We take care to keep the cars, prices, photos and descriptions on this site accurate and up to date. Cars sell and details change, so something shown here may already have gone or changed.
          A car listed on this site is an invitation to enquire, not an offer to sell. A sale is only made when you and we have both signed a sales contract for that car.
        </p>
        <p>If you spot a mistake, tell us. If a car or price was shown in error, we may correct it and are not bound to sell at the wrong figure. Please contact us to check a car is still available before you travel to see it.</p>
      </InfoSection>
      <InfoSection title="Finance Figures">
        <p>
          Finance figures on this site are estimates only, worked out at an example rate. They are not an approval or an offer of credit. Finance is provided through a lender, subject to status. The rate and
          amount you are offered depend on your circumstances, and the lender confirms them. Nothing on this site is financial advice.
        </p>
      </InfoSection>
      <InfoSection title="Trade-In Valuations and Requests">
        <p>
          A trade-in valuation we give you after an online request is an estimate, based on what you tell us and your photos. It can change when we inspect the car. Sending a trade-in or find-a-car request does not commit you or us to anything.
        </p>
        <p>
          You must give us true and complete information. When you send a request through a form, you agree to us using your details as set out in our{" "}
          <Link href="/privacy" className="font-semibold underline">
            Privacy Policy
          </Link>
          .
        </p>
      </InfoSection>
      <InfoSection title="Reviews and Other Websites">
        <p>
          Reviews on this site come from Google and are shown as written. We don&apos;t edit them. This site links to other websites, such as maps and social media. We don&apos;t control them and are not responsible for their content or how they use your information.
        </p>
      </InfoSection>
      <InfoSection title="Our Content">
        <p>
          The text, photos, logo and design of this site belong to us or are used with permission. You may view the site and print a page for your own use. You may not copy, sell or republish our content without our written permission.
        </p>
      </InfoSection>
      <InfoSection title="Our Responsibility">
        <p>
          We provide this site as it is, and we can&apos;t promise it will always be available or free of errors. To the extent the law allows, we are not responsible for loss that comes from using the site or relying on
          its content, such as a car being sold before you arrive.
        </p>
        <p>
          Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything the law does not allow us to limit. These terms do not affect your statutory rights as a
          consumer when you buy a car from us, including your rights under the Sale of Goods and Supply of Services Act 1980 and the Consumer Rights Act 2022.
        </p>
      </InfoSection>
      <InfoSection title="Changes">
        <p>We may update these terms from time to time. The date at the top shows when they last changed. If you keep using the site after a change, you accept the new terms.</p>
      </InfoSection>
      <InfoSection title="Law">
        <p>These terms are governed by the law of Ireland, and the Irish courts can decide any dispute about them. If you are a consumer, you also keep any right to go to the courts of the country where you live.</p>
      </InfoSection>
      <InfoSection title="Contact">
        <p>
          Questions about these terms? Email us at{" "}
          <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
            {DEALER_EMAIL}
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}
