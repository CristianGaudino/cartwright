"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PhoneLink } from "@/components/PhoneLink";
import { CalendarIcon, CloseIcon, PhoneIcon } from "@/components/stock/icons";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LIMITS } from "@/lib/leads/constants";
import { DEALER_TEL } from "@/lib/site";
import { DriveFields } from "./DriveFields";
import { ContactFields, Field } from "./Field";
import { LeadForm } from "./LeadForm";
import { closeButton, press, secondaryButton } from "@/components/ui";

// What the client needs to show a car. Never the Car object: the server reads the car again by id (LED-02).
export type CarSummary = { id: string; name: string; title: string; price: string; photo?: string };

// A native modal dialog on the Phase 1 sheet rules (D-09). It stays in the DOM while closed, so the form inside keeps its
// text (research Pattern 2). The Close button is the first focusable element, so showModal() focuses it, not a field.
// The dealer's number is always under the title, with the country code, as a link that dials.
export function LeadDialog({ title, open, onClose, children }: { title: string; open: boolean; onClose(): void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog ref={dialog} className="sheet lead" aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
        <h2 id={titleId} className="text-heading font-semibold">
          {title}
        </h2>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className={closeButton}>
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>
      <p className="shrink-0 px-4 pb-2 text-meta text-text-2">
        Or call us on <PhoneLink className="font-semibold text-text underline" />
      </p>
      {children}
    </dialog>
  );
}

// The car page action area: Enquire About This Car in the accent with Book a Test Drive beside it, then Call Us and WhatsApp. Each opens
// its own dialog and form (a test drive asks for a day and a time, #166), so each keeps what was typed in it.
export function LeadActions({ car, whatsapp }: { car: CarSummary; whatsapp: string }) {
  const [open, setOpen] = useState<"enquiry" | "drive">();
  const opener = useRef<HTMLButtonElement>(null);
  const secondary = `flex h-12 items-center justify-center gap-2 px-3 text-text ${secondaryButton}`;
  // Once these buttons have scrolled up out of view, a slim bar at the foot of a phone offers them again.
  const row = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // The area reaches far below the screen, so "out of it" means scrolled off the top: a jump from below the fold past the row still fires.
    const o = new IntersectionObserver(([e]) => setGone(!e.isIntersecting), { rootMargin: "0px 0px 100000px 0px" });
    o.observe(row.current!);
    return () => o.disconnect();
  }, []);
  const bar = `flex h-11 flex-1 items-center justify-center px-2 font-semibold ${press}`; // flex-1: a short label gives a long one room at 320px

  const show = (el: HTMLButtonElement, which: "enquiry" | "drive") => {
    opener.current = el;
    setOpen(which);
  };
  const close = () => {
    setOpen(undefined);
    opener.current?.focus();
  };

  return (
    <>
      <div ref={row} className="grid grid-cols-2 gap-2 whitespace-nowrap">
        <button type="button" onClick={(e) => show(e.currentTarget, "enquiry")} className={`col-span-2 flex h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-3 font-semibold text-white sm:col-span-1 ${press}`}>
          Enquire About This Car
        </button>
        <button type="button" onClick={(e) => show(e.currentTarget, "drive")} className={`col-span-2 sm:col-span-1 ${secondary}`}>
          <CalendarIcon className="size-5 text-accent" />
          Book a Test Drive
        </button>
        <a href={`tel:${DEALER_TEL}`} className={secondary}>
          <PhoneIcon className="size-5 text-accent" />
          Call Us
        </a>
        <WhatsAppButton href={whatsapp} sizing="px-3" />
      </div>
      <LeadDialog title="Enquire About This Car" open={open === "enquiry"} onClose={close}>
        <LeadForm
          type="enquiry"
          car={car}
          variant="dialog"
          submitLabel="Send Enquiry"
          success={{ heading: "Thanks, we have your enquiry.", body: `We'll get back to you about the ${car.name}.` }}
        >
          {({ bind }) => (
            <>
              <ContactFields bind={bind} />
              <Field {...bind("message")} label="Message" optional multiline maxLength={LIMITS.message} />
            </>
          )}
        </LeadForm>
      </LeadDialog>
      <LeadDialog title="Book a Test Drive" open={open === "drive"} onClose={close}>
        <LeadForm
          type="test_drive"
          car={car}
          variant="dialog"
          submitLabel="Send Request"
          success={{ heading: "Thanks, we have your request.", body: `We'll call you to confirm your test drive of the ${car.name}. It isn't booked until we do.` }}
        >
          {({ bind }) => <DriveFields bind={bind} carId={car.id} />}
        </LeadForm>
      </LeadDialog>
      {/* Below 1024px only. Hidden with visibility, so it is out of the tab order and the accessibility tree until it shows. Its labels
          are shorter than the buy box's, so each name on the page still means one button. */}
      <div
        data-sticky-actions
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-[translate,visibility] duration-200 reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none motion-reduce:transition-none lg:hidden ${gone ? "" : "invisible translate-y-full"}`}
      >
        <div className="flex gap-2 whitespace-nowrap">
          <a href={`tel:${DEALER_TEL}`} className={`${bar} text-text ${secondaryButton}`}>
            Call
          </a>
          <button type="button" onClick={(e) => show(e.currentTarget, "enquiry")} className={`${bar} rounded-control bg-accent text-white`}>
            Enquire
          </button>
          <button type="button" onClick={(e) => show(e.currentTarget, "drive")} className={`${bar} text-text ${secondaryButton}`}>
            Test Drive
          </button>
        </div>
      </div>
    </>
  );
}
