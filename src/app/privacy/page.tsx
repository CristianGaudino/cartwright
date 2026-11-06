import type { Metadata } from "next";
import { LEAD_RETENTION_MONTHS } from "@/lib/leads/schema";
import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

// Stub so the consent link is never dead (UI-SPEC Privacy page stub). Phase 4 replaces the copy, not the route.
// Deletion requests go to DEALER_PHONE only: the dealer has no public email yet, and the lead inbox is private (research
// Open Question 6). Add an email beside the phone line when the dealer supplies one.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Privacy policy</h1>
      <div className="mt-6 flex max-w-[65ch] flex-col gap-8 text-body">
        <section className="flex flex-col gap-2">
          <h2 className="text-heading font-semibold">What we collect</h2>
          <p>
            When you send us a request, we keep what you type into the form: your name, phone number, email, your message and the other fields of that
            form, such as a preferred day for a test drive. We also note the car you asked about, the page you sent it from and when you agreed to this
            policy. Nothing about your device is stored.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-heading font-semibold">Why we use it</h2>
          <p>Only to reply to your request. We do not use it for marketing, and we do not sell it.</p>
          <p>
            Cloudflare hosts this site, runs the bot check on our forms and delivers your request to us by email. Neon keeps the requests in a database
            in Frankfurt, in the EU.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-heading font-semibold">How long we keep it</h2>
          <p>We keep each request for {LEAD_RETENTION_MONTHS} months, then delete it. We are still confirming this period.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-heading font-semibold">How to ask us to delete it</h2>
          <p>
            Call us on{" "}
            <a href={`tel:${DEALER_TEL}`} className="font-semibold underline">
              {DEALER_PHONE}
            </a>{" "}
            and we will delete your details.
          </p>
        </section>
      </div>
    </main>
  );
}
