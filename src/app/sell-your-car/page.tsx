import type { Metadata } from "next";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";

export const metadata: Metadata = { title: "Sell your car in Tralee" };

export default function SellYourCarPage() {
  return (
    <LeadPage title="Sell your car" intro="Tell us about your car and we will come back with a valuation.">
      <LeadPageForm
        type="trade_in"
        submitLabel="Get my valuation"
        success={{ heading: "Thanks, we have your car details.", body: "We will come back with a valuation." }}
      />
    </LeadPage>
  );
}
