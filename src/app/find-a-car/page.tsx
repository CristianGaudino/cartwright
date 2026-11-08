import type { Metadata } from "next";
import { LeadPage, Tips } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";

export const metadata: Metadata = { title: "Find a car", description: "Can't see the car you want? Tell us what you're looking for and we'll look for it. Carright, Tralee, Co. Kerry." };

export default function FindACarPage() {
  return (
    <LeadPage
      title="Find a Car"
      intro="Can't see the car you want in stock? Tell us what you're looking for and we'll look for it."
      how={[
        { title: "Tell us what you want", text: "The make and model if you know them, your budget, and what matters to you." },
        { title: "We look for it", text: "We search for a car that fits what you asked for." },
        { title: "We get in touch", text: "If we find a match, we contact you. No obligation." },
      ]}
      aside={
        <Tips
          title="Help us find the right one"
          items={["Make and model, or just the type of car", "Your budget, as a top figure", "Year, fuel and gearbox you prefer", "Colour, mileage or extras you must have", "Anything you want to avoid"]}
        />
      }
    >
      <LeadPageForm type="sourcing" submitLabel="Ask Us to Find It" success={{ heading: "Thanks, we'll look for it.", body: "We'll get in touch if we find a match." }} />
    </LeadPage>
  );
}
