import Image from "next/image";
import Link from "next/link";
import { HeaderLinks } from "@/components/HeaderLinks";
import { MobileMenu } from "@/components/MobileMenu";
import { SavedLink } from "@/components/saved/SavedLink";
import { SITE_NAME } from "@/lib/site";

// The phone menu holds every page; the footer repeats them (#57). From 1024px the header shows the mockup's links.
const MENU = [
  { href: "/", label: "Home" },
  { href: "/used-cars", label: "Used Cars" },
  { href: "/finance", label: "Finance" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/find-a-car", label: "Find a Car" },
  { href: "/compare", label: "Compare Cars" },
  { href: "/service", label: "Service" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="border-b border-hairline bg-ink text-white">
      <div className="relative mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        {/* Phones: the logo sits dead centre, the menu button on the left and the heart on the right (the nav spans the bar). */}
        <Link href="/" className="absolute left-1/2 z-10 flex h-11 -translate-x-1/2 items-center focus-visible:outline-white lg:static lg:translate-x-0">
          <Image src="/brand/logo.svg" width={480} height={109} alt={SITE_NAME} loading="eager" className="h-7 w-auto sm:h-8 lg:h-9" />
        </Link>
        <nav aria-label="Main" className="flex w-full items-center justify-between lg:w-auto lg:gap-6">
          <HeaderLinks />
          <MobileMenu links={MENU} />
          <SavedLink />
        </nav>
      </div>
    </header>
  );
}
