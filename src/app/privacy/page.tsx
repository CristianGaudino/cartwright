import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/InfoPage";
import { LEAD_RETENTION_MONTHS } from "@/lib/leads/constants";
import { DEALER_EMAIL } from "@/lib/site";
import { PhoneLink } from "@/components/PhoneLink";

export const metadata: Metadata = { title: "Privacy policy" };

// Phase 3 copy on the shared frame (Phase 4); only the dealer's final wording is outstanding.
// The email is a placeholder until carright.ie forwards to the dealer (issue #54).
export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy">
      <InfoSection title="What we collect">
        <p>
          When you send us a request, we keep what you type into the form: your name, phone number, email, your message and the other fields of that
          form, such as a preferred day for a test drive. We also note the car you asked about, the page you sent it from and when you agreed to this
          policy. Nothing about your device is stored.
        </p>
        <p>
          If you add photos of your car, your phone shrinks them before they are sent, which also removes the location and camera details. We keep
          them for the same {LEAD_RETENTION_MONTHS} months as the rest of your request.
        </p>
      </InfoSection>
      <InfoSection title="Why we use it">
        <p>Only to reply to your request. We do not use it for marketing, and we do not sell it.</p>
        <p>
          Cloudflare hosts this site, runs the bot check on our forms and delivers your request to us by email. Cloudflare also keeps the
          requests in a database, and trade-in photos, in the EU.
        </p>
      </InfoSection>
      <InfoSection title="How long we keep it">
        <p>We keep each request for {LEAD_RETENTION_MONTHS} months, then delete it.</p>
      </InfoSection>
      <InfoSection title="How to ask us to delete it">
        <p>
          Call us on{" "}
          <PhoneLink />{" "}
          or email{" "}
          <a href={`mailto:${DEALER_EMAIL}`} className="font-semibold underline">
            {DEALER_EMAIL}
          </a>{" "}
          and we will delete your details.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
