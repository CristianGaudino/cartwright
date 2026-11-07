import type { Metadata } from "next";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";

export const metadata: Metadata = { title: "Find a car", description: "Cannot see the car you want? Tell us what you are looking for and we will look for it. Carright, Tralee, Co. Kerry." };

export default function FindACarPage() {
  return (
    <LeadPage title="Find a Car" intro="Cannot see what you want? Tell us and we will look for it.">
      <LeadPageForm type="sourcing" submitLabel="Ask Us to Find It" success={{ heading: "Thanks, we will look for it.", body: "We will get in touch if we find a match." }} />
    </LeadPage>
  );
}
