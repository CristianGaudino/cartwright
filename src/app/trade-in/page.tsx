import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { PHOTO_MIN_COUNT, PHOTO_SLOTS } from "@/lib/leads/constants";

export const metadata: Metadata = {
  title: "Trade-In Valuation",
  description: `Trading in your car? Tell us about it, send some photos and we'll come back with a valuation towards your next one. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

export default function TradeInPage() {
  return (
    <LeadPage
      title="Trade-In Valuation"
      intro="Trading in your car? Tell us about it and we'll come back with a valuation towards your next one."
      how={[
        {
          title: "Tell Us About Your Car",
          text: "Its registration, mileage and condition.",
          more: ["Note any known issues. It avoids surprises when we see the car."],
        },
        {
          title: "Send Some Photos",
          text: "A few clear photos, including any damage.",
          more: [`At least ${PHOTO_MIN_COUNT} photos, and more is better: ${PHOTO_SLOTS.join(", ")}. Include all damage, even small marks.`],
        },
        {
          title: "We Come Back to You",
          text: "We contact you with a valuation, and arrange to see the car.",
          more: ["The valuation is an estimate. It can change when we inspect the car.", "The value goes towards the car you buy from us."],
        },
      ]}
    >
      <LeadPageForm
        type="trade_in"
        submitLabel="Get My Valuation"
        success={{ heading: "Thanks, we have your car details.", body: "We'll contact you with a valuation. It's an estimate until we've seen the car." }}
      />
    </LeadPage>
  );
}
