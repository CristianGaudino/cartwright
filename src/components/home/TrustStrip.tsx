import Link from "next/link";
import { IconBadge, TitleText } from "@/components/Feature";
import { CalculatorIcon, CarIcon, LayersIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { WARRANTY } from "@/lib/site";
import { card } from "@/components/ui";

// The mockup's five reasons to buy, each a link to the page that says more. The two warranty lines are the dealer's to confirm
// (DEALER_FACTS_CONFIRMED, which still fails a production deploy).
const ITEMS = [
  { Icon: ShieldCheckIcon, ...WARRANTY, href: "/warranty" },
  { Icon: LayersIcon, title: "Extended Warranty", text: "Longer cover is available.", href: "/warranty" },
  { Icon: CalculatorIcon, title: "Flexible Finance", text: "Finance options to suit you.", href: "/finance" },
  { Icon: SwapIcon, title: "Trade-In Welcome", text: "Get a fair, no-hassle valuation.", href: "/trade-in" },
  { Icon: CarIcon, title: "Test Drives", text: "Available on all vehicles. Call or visit us today.", href: "/used-cars" },
];

// A banner: one panel, a badge per reason. The cells carry their own padding (no negative margins), so a highlighted cell can never
// push its text past its box.
export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className={`overflow-hidden ${card}`}>
      <ul className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
        {ITEMS.map(({ Icon, title, text, href }) => (
          <li key={title} className="sm:max-lg:border-b sm:max-lg:border-hairline sm:max-lg:odd:border-r sm:max-lg:last:border-b-0">
            <Link href={href} className="flex h-full min-h-11 items-start gap-4 p-5 transition-colors hover:bg-hairline/50 lg:flex-col lg:gap-3">
              <IconBadge>
                <Icon className="size-6" />
              </IconBadge>
              <TitleText title={title} text={text} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
