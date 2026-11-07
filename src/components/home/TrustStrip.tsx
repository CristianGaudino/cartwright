import Link from "next/link";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { CalculatorIcon, CarIcon, LayersIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DEALER_FACTS_CONFIRMED, WARRANTY } from "@/lib/site";

// The mockup's five reasons to buy. The two warranty lines are the dealer's to confirm, so the strip carries the Placeholder
// pill until DEALER_FACTS_CONFIRMED flips; the other three describe pages that exist.
const ITEMS = [
  { Icon: ShieldCheckIcon, ...WARRANTY },
  { Icon: LayersIcon, title: "Extended warranty", text: "Longer cover is available." },
  { Icon: CalculatorIcon, title: "Flexible finance", text: "Work out a monthly payment online.", href: "/finance" },
  { Icon: SwapIcon, title: "Trade-in welcome", text: "Get a fair valuation for your car.", href: "/sell-your-car" },
  { Icon: CarIcon, title: "Test drives", text: "Book one on any car in stock.", href: "/used-cars" },
];

export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className="flex flex-col gap-4">
      {!DEALER_FACTS_CONFIRMED && <PlaceholderPill>Placeholder details</PlaceholderPill>}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
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
