import Image from "next/image";
import Link from "next/link";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/stock/icons";
import { CHECKWORK_URL, DEALER_ADDRESS_LINES, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { PhoneLink } from "@/components/PhoneLink";

// Below 1024px the footer is the way to every page (UI-SPEC Mobile navigation).
const GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/used-cars", label: "Used Cars" },
      { href: "/finance", label: "Finance" },
      { href: "/trade-in", label: "Trade-In Valuation" },
      { href: "/find-a-car", label: "Find a Car" },
      { href: "/saved", label: "Saved Cars" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/service", label: "Service" },
      { href: "/warranty", label: "Warranty" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

const SOCIAL_ICONS = { Facebook: FacebookIcon, Instagram: InstagramIcon, TikTok: TikTokIcon };

const link = "inline-flex min-h-11 items-center transition-colors hover:text-text-2";

// No top margin of its own: pages already end with 64px padding (03-10). No year in the copyright, so a cached page
// never goes stale.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-ink">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-2 lg:col-span-1">
            <Link href="/" className={link}>
              <Image src="/brand/logo.svg" width={480} height={109} alt={SITE_NAME} className="h-8 w-auto" />
            </Link>
            <address className="text-body not-italic">
              {DEALER_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <PhoneLink className={`${link} text-body font-semibold`} />
            <Link href="/contact" className={`${link} underline`}>
              Opening Hours and Directions
            </Link>
            <ul aria-label="Social media" className="-ml-3 flex">
              {SOCIAL_LINKS.map(({ name, href }) => {
                const Icon = SOCIAL_ICONS[name];
                return (
                  <li key={name}>
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:text-text-2">
                      <Icon className="size-6" />
                    </a>
                  </li>
                );
              })}
            </ul>
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
        <div className="flex flex-wrap items-center justify-between gap-x-6 border-t border-hairline pt-6 text-meta text-text-2">
          <p>© {SITE_NAME}</p>
          <a href={CHECKWORK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-text">
            Powered by
            <Image src="/brand/checkwork-logo-on-dark.svg" width={345} height={60} alt="Checkwork" unoptimized className="h-4 w-auto" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
