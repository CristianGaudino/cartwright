import Link from "next/link";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { CalculatorIcon, CarIcon, LayersIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DEALER_FACTS_CONFIRMED, WARRANTY } from "@/lib/site";

// The mockup's five reasons to buy. The two warranty lines are the dealer's to confirm, so the strip carries the Placeholder
// pill until DEALER_FACTS_CONFIRMED flips; the other three describe pages that exist.
const ITEMS = [
  { Icon: ShieldCheckIcon, ...WARRANTY },
  { Icon: LayersIcon, title: "Extended Warranty", text: "Longer cover is available." },
  { Icon: CalculatorIcon, title: "Flexible Finance", text: "Finance options to suit you.", href: "/finance" },
  { Icon: SwapIcon, title: "Trade-In Welcome", text: "Get a fair, no-hassle valuation.", href: "/sell-your-car" },
  { Icon: CarIcon, title: "Test Drives", text: "Available on all vehicles. Call or visit us today.", href: "/used-cars" },
];

export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className="flex flex-col gap-4">
      {!DEALER_FACTS_CONFIRMED && <PlaceholderPill>Placeholder details</PlaceholderPill>}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
        {ITEMS.map(({ Icon, title, text, href }) => {
          const body = (
            <>
              <Icon className="size-8 shrink-0 text-accent" />
              <span className="mt-3 text-body font-semibold">{title}</span>
              <span className="text-meta text-text-2">{text}</span>
            </>
          );
          return (
            <li key={title}>
              {href ? (
                <Link href={href} className="-m-2 flex min-h-11 flex-col items-start rounded-card p-2 transition-colors hover:bg-card">
                  {body}
                </Link>
              ) : (
                <div className="flex h-full flex-col items-start">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
