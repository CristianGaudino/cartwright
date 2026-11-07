import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

// From 1024px only; below it the header shows Used cars and the footer carries the rest (UI-SPEC Mobile navigation).
const WIDE = [
  { href: "/finance", label: "Finance" },
  { href: "/sell-your-car", label: "Sell your car" },
  { href: "/find-a-car", label: "Find a car" },
  { href: "/service", label: "Service" },
  { href: "/contact", label: "Contact" },
];

// Normal flow on purpose: the header scrolls away with the page (D-12).
export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/" className="focus-visible:outline-white">
          <Image src="/brand/logo.png" width={480} height={109} alt={SITE_NAME} loading="eager" className="h-8 w-auto lg:h-9" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6">
          <Link href="/used-cars" className="font-semibold focus-visible:outline-white">
            Used cars
          </Link>
          {WIDE.map((l) => (
            <Link key={l.href} href={l.href} className="hidden font-semibold focus-visible:outline-white lg:inline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
