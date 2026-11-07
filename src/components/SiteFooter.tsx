import Link from "next/link";

// Minimal footer (UI-SPEC Footer): the mobile way to every page. Each new page adds its link here; Phase 4 completes it.
const LINKS = [
  { href: "/used-cars", label: "Used cars" },
  { href: "/finance", label: "Finance" },
  { href: "/sell-your-car", label: "Sell your car" },
  { href: "/find-a-car", label: "Find a car" },
  { href: "/privacy", label: "Privacy policy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-ink">
      <ul className="mx-auto flex max-w-[1280px] flex-wrap gap-x-6 px-4 py-6 sm:px-6 lg:px-8">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-11 items-center text-body">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
