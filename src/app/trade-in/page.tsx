import type { Metadata } from "next";
import { LeadPage, Tips } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";

export const metadata: Metadata = {
  title: "Trade-in valuation",
  description: "Trading in your car? Tell us about it, send some photos and we will come back with a valuation towards your next one. Carright, Tralee, Co. Kerry.",
};

export default function TradeInPage() {
  return (
    <LeadPage
      title="Trade-In Valuation"
      intro="Trading in your car? Tell us about it and we will come back with a valuation towards your next one."
      how={[
        { title: "Tell us about your car", text: "Its registration, mileage and condition. Four short steps." },
        { title: "Send some photos", text: "A few clear photos, including any damage." },
        { title: "We come back to you", text: "We contact you with a valuation, and arrange to see the car." },
      ]}
      aside={
        <>
          <Tips
            title="Good to know"
            items={[
              "The valuation is an estimate. It can change when we inspect the car.",
              "Include all damage in your photos, even small marks.",
              "Note any known issues. It avoids surprises when we see the car.",
              "The value goes towards the car you buy from us.",
            ]}
          />
          <Tips title="Photos that help" items={["Front, back and both sides", "The inside and the dashboard showing the mileage", "Each wheel and tyre", "Every dent, scratch or mark, close up"]} />
        </>
      }
    >
      <LeadPageForm
        type="trade_in"
        submitLabel="Get My Valuation"
        success={{ heading: "Thanks, we have your car details.", body: "We will contact you with a valuation. It is an estimate until we have seen the car." }}
      />
    </LeadPage>
  );
}
