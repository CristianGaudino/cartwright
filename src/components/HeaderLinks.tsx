"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/stock/icons";

// The desktop links (from 1024px) and the one phone link. A red bar under the current section, as in the mockup.
const item = "relative inline-flex min-h-11 items-center gap-1 text-meta font-semibold transition-colors hover:text-text-2 focus-visible:outline-white";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";

const STOCK = [
  { href: "/used-cars", label: "All Used Cars" },
  { href: "/find-a-car", label: "Find a Car" },
  { href: "/compare", label: "Compare Cars" },
];
const LINKS = [
  { href: "/finance", label: "Finance" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/service", label: "Service" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const within = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function HeaderLinks() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const stockActive = STOCK.some((s) => within(path, s.href));

  // Light dismiss: a press outside, Escape, or choosing a link.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <>
      {/* Phones: one link; the menu button holds the rest. */}
      <Link href="/used-cars" className={`${item} text-body max-[359px]:hidden lg:hidden`}>
        Used Cars
      </Link>
      <div className="hidden items-center gap-6 lg:flex">
        <div ref={root} className="relative">
          <button type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)} className={`${item} ${stockActive ? bar : ""}`}>
            Stock
            <ChevronDownIcon className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ul id={menuId} className="absolute left-0 top-full z-30 mt-1 min-w-48 rounded-card border border-hairline bg-card p-2 shadow-lift">
              {STOCK.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-control px-3 text-meta font-semibold hover:bg-hairline">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={within(path, l.href) ? "page" : undefined} className={`${item} ${within(path, l.href) ? bar : ""}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
