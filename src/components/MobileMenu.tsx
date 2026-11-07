"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { PhoneLink } from "@/components/PhoneLink";
import { CloseIcon, MenuIcon, PhoneIcon } from "@/components/stock/icons";
import { accentButton, press } from "@/components/ui";

// Every page from one tap, below 1024px (the header links show from there). A native modal dialog docked to the bottom, in
// thumb reach, with the same slide and scrim as the filter sheet (dialog.sheet in globals.css).
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // From 1024px the trigger is display:none; an open modal dialog would stay open there, invisible, keeping the page inert.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && dialog.current?.close();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-control focus-visible:outline-white lg:hidden ${press}`}
      >
        <MenuIcon />
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby={titleId} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-heading font-semibold">
            Menu
          </h2>
          <button type="button" aria-label="Close menu" onClick={() => dialog.current?.close()} className={`-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full ${press}`}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
          <nav aria-label="Menu">
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-b border-hairline last:border-b-0">
                  {/* Closing here, not on a route change: the header stays mounted, so the dialog would otherwise stay open. */}
                  <Link href={l.href} onClick={() => dialog.current?.close()} className="flex min-h-12 items-center text-heading font-semibold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <PhoneLink className={`flex w-full items-center justify-center gap-2 ${accentButton}`}>
            <PhoneIcon className="size-5" />
            Call now
          </PhoneLink>
        </div>
      </dialog>
    </>
  );
}
