import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { sourcingPrefill } from "@/lib/leads/sourcing-prefill";

export const metadata: Metadata = { title: "Find a Car", description: `Can't see the car you want? Tell us what you're looking for and we'll look for it. ${SITE_NAME}, ${DEALER_LOCATION}.` };

// A search with no cars sends its make, model, type and budget: the form starts with the ones it accepts (sourcing-prefill.ts).
export default async function FindACarPage({ searchParams }: PageProps<"/find-a-car">) {
  const prefill = sourcingPrefill(await searchParams);
  return (
    <LeadPage
      title="Find a Car"
      intro="Can't see the car you want in stock? Tell us what you're looking for and we'll look for it."
      how={[
        {
          title: "Tell Us What You Want",
          text: "The make and model if you know them, your budget, and what matters to you.",
          more: ["A make and model, or just the type of car", "Your budget, as a top figure", "Year, fuel and gearbox you prefer", "Colour, mileage or extras you must have", "Anything you want to avoid"],
        },
        { title: "We Look for It", text: "We search for a car that fits what you asked for.", more: ["We use what you tell us, so the more you add, the better the match."] },
        { title: "We Get in Touch", text: "If we find a match, we contact you. No obligation.", more: ["We reach you by the phone number or email you give us.", "There is no obligation to buy."] },
      ]}
    >
      <LeadPageForm type="sourcing" prefill={prefill} submitLabel="Ask Us to Find It" success={{ heading: "Thanks, we'll look for it.", body: "We'll get in touch if we find a match." }} />
    </LeadPage>
  );
}
