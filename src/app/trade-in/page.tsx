import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { PHOTO_MIN_COUNT, PHOTO_SLOTS } from "@/lib/leads/constants";
import { stock } from "@/lib/stock";
import { carSummary } from "@/lib/stock/format";
import { isSold, SLUG } from "@/lib/stock/types";

export const metadata: Metadata = {
  title: "Trade-In Valuation",
  description: `Trading in your car? Tell us about it, send some photos and we'll come back with a valuation towards your next one. ${SITE_NAME}, ${DEALER_LOCATION}.`,
};

// From a car page (?car=its-slug) the trade-in is against that car. Only a slug-shaped value is looked up, and only a car still for sale is
// chosen: anything else is a plain trade-in. The server reads the car again by id when the form is sent.

export default async function TradeInPage({ searchParams }: PageProps<"/trade-in">) {
  const { car: slug } = await searchParams;
  const found = typeof slug === "string" && slug.length <= 120 && SLUG.test(slug) ? await stock.getBySlug(slug).catch(() => null) : null;
  const car = found && !isSold(found) ? carSummary(found) : undefined;
  return (
    <LeadPage
      title="Trade-In Valuation"
      intro="Trading in your car? Tell us about it and we'll come back with a valuation towards your next one."
      how={[
        {
          title: "Tell Us About Your Car",
          text: "Its registration, mileage and condition.",
          more: ["Note any known issues."],
        },
        {
          title: "Send Some Photos",
          text: "A few clear photos, including any damage.",
          more: [`At least ${PHOTO_MIN_COUNT} photos, and more is better: ${PHOTO_SLOTS.filter((s) => s !== "Any Damage").join(", ")}.`, "Include photos of all damage, even small marks."],
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
        car={car}
        submitLabel="Get My Valuation"
        success={{ heading: "Thanks, we have your car details.", body: "We'll contact you with a valuation. It's an estimate until we've seen the car." }}
      />
    </LeadPage>
  );
}
