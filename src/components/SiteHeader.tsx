import Image from "next/image";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { SavedLink } from "@/components/saved/SavedLink";
import { SITE_NAME } from "@/lib/site";

// From 1024px only; below it the menu button opens every page (#57), and the footer repeats them.
const WIDE = [
  { href: "/finance", label: "Finance" },
  { href: "/sell-your-car", label: "Sell your car" },
  { href: "/find-a-car", label: "Find a car" },
  { href: "/service", label: "Service" },
  { href: "/contact", label: "Contact" },
];

const MENU = [{ href: "/used-cars", label: "Used cars" }, ...WIDE, { href: "/about", label: "About us" }];

// 44px tall touch targets inside the 56px bar.
const link = "min-h-11 items-center font-semibold focus-visible:outline-white";

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="flex h-11 items-center focus-visible:outline-white">
          <Image src="/brand/logo.png" width={480} height={109} alt={SITE_NAME} loading="eager" className="h-7 w-auto sm:h-8 lg:h-9" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-3 lg:gap-6">
          <Link href="/used-cars" className={`inline-flex max-[359px]:hidden ${link}`}>
            Used cars
          </Link>
          {WIDE.map((l) => (
            <Link key={l.href} href={l.href} className={`hidden lg:inline-flex ${link}`}>
              {l.label}
            </Link>
          ))}
          <SavedLink />
          <MobileMenu links={MENU} />
        </nav>
      </div>
    </header>
  );
}
