import Image from "next/image";
import Link from "next/link";
import { DEALER_PHONE, DEALER_TEL, SITE_NAME } from "@/lib/site";

// Below 1024px the footer is the way to every page (UI-SPEC Mobile navigation).
const GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/used-cars", label: "Used cars" },
      { href: "/finance", label: "Finance" },
      { href: "/sell-your-car", label: "Sell your car" },
      { href: "/find-a-car", label: "Find a car" },
      { href: "/saved", label: "Saved cars" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/service", label: "Service" },
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

const link = "inline-flex min-h-11 items-center";

// No top margin of its own: pages already end with 64px padding (03-10). No year in the copyright, so a cached page
// never goes stale.
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-ink">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-2 lg:col-span-1">
            <Link href="/" className={link}>
              <Image src="/brand/logo.png" width={480} height={109} alt={SITE_NAME} className="h-8 w-auto" />
            </Link>
            <p className="text-body">Tralee, Co. Kerry</p>
            <a href={`tel:${DEALER_TEL}`} className={`${link} text-body font-semibold`}>
              {DEALER_PHONE}
            </a>
            <Link href="/contact" className={`${link} underline`}>
              Opening hours and directions
            </Link>
          </div>
          {/* Groups are divs, not sections, so section lookups on car pages stay unique. */}
          <nav aria-label="Footer" className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-8 lg:col-span-3 lg:grid-cols-3">
            {GROUPS.map((g) => (
              <div key={g.title} className={g.title === "Legal" ? "col-span-2 lg:col-span-1" : undefined}>
                <h2 className="text-meta font-semibold text-text-2">{g.title}</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={`${link} text-body`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="border-t border-hairline pt-8 text-meta text-text-2">© {SITE_NAME}</p>
      </div>
    </footer>
  );
}
