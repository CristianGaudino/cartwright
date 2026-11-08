import Link from "next/link";
import { CalculatorIcon, CarIcon, LayersIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { WARRANTY } from "@/lib/site";

// The mockup's five reasons to buy, each a link to the page that says more. The two warranty lines are the dealer's to confirm
// (DEALER_FACTS_CONFIRMED, which still fails a production deploy).
const ITEMS = [
  { Icon: ShieldCheckIcon, ...WARRANTY, href: "/warranty" },
  { Icon: LayersIcon, title: "Extended Warranty", text: "Longer cover is available.", href: "/warranty" },
  { Icon: CalculatorIcon, title: "Flexible Finance", text: "Finance options to suit you.", href: "/finance" },
  { Icon: SwapIcon, title: "Trade-In Welcome", text: "Get a fair, no-hassle valuation.", href: "/sell-your-car" },
  { Icon: CarIcon, title: "Test Drives", text: "Available on all vehicles. Call or visit us today.", href: "/used-cars" },
];

// A banner: one panel, a badge per reason. The cells carry their own padding (no negative margins), so a highlighted cell can never
// push its text past its box.
export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className="overflow-hidden rounded-card border border-hairline bg-card">
      <ul className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
        {ITEMS.map(({ Icon, title, text, href }) => (
          <li key={title} className="sm:border-b sm:border-hairline sm:odd:border-r lg:border-b-0 lg:odd:border-r-0 sm:[&:nth-last-child(-n+1)]:border-b-0">
            <Link href={href} className="flex h-full min-h-11 items-start gap-4 p-5 transition-colors hover:bg-hairline/50 lg:flex-col lg:gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
                <Icon className="size-6" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-body font-semibold">{title}</span>
                <span className="text-meta text-text-2">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
