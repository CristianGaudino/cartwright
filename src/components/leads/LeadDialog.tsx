"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, PhoneIcon } from "@/components/stock/icons";
import { LIMITS } from "@/lib/leads/constants";
import { DEALER_TEL } from "@/lib/site";
import { CarFields, TypePicker } from "./CarFields";
import type { CarLeadType } from "./CarFields";
import { ContactFields, Field } from "./Field";
import { LeadForm } from "./LeadForm";

// What the client needs to show a car. Never the Car object: the server reads the car again by id (LED-02).
export type CarSummary = { id: string; name: string; title: string; price: string; photo?: string };

const press = "active:scale-[0.97] motion-reduce:active:scale-100";
const action = `flex h-12 w-full items-center justify-center gap-2 rounded-control font-semibold ${press}`;

// A native modal dialog on the Phase 1 sheet rules (D-09). It stays in the DOM while closed, so the form inside keeps its
// text (research Pattern 2). The Close button is the first focusable element, so showModal() focuses it, not a field.
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
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
        <h2 id={titleId} className="text-heading font-semibold">
          {title}
        </h2>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className={`-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full ${press}`}>
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

// Title, submit label and thanks per type (UI-SPEC Copywriting Contract).
const COPY: Record<CarLeadType, { title: string; submit: string; heading: string; body(car: CarSummary): string }> = {
  enquiry: { title: "Enquire", submit: "Send enquiry", heading: "Thanks, we have your enquiry.", body: (car) => `We will get back to you about the ${car.name}.` },
  test_drive: { title: "Book a test drive", submit: "Request test drive", heading: "Thanks, we have your request.", body: () => "We will call you to confirm a time for a test drive." },
  reserve: { title: "Request to reserve", submit: "Request to reserve", heading: "Thanks, we have your request.", body: () => "This is not a booking yet. We will call you to confirm." },
};

// The car page action area (UI-SPEC): two rows of two 48px buttons inside the reserved 104px. Enquire takes the accent;
// Call now, Test drive and Reserve are secondary. The three form buttons open the one dialog with their type selected.
export function LeadActions({ car }: { car: CarSummary }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CarLeadType>("enquiry");
  const opener = useRef<HTMLButtonElement>(null);
  const copy = COPY[type];
  const secondary = `${action} border border-control bg-card text-text`;

  const show = (t: CarLeadType, el: HTMLButtonElement) => {
    opener.current = el;
    setType(t);
    setOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 whitespace-nowrap">
        <button type="button" onClick={(e) => show("enquiry", e.currentTarget)} className={`${action} bg-accent text-white`}>
          Enquire
        </button>
        <a href={`tel:${DEALER_TEL}`} className={secondary}>
          <PhoneIcon />
          Call now
        </a>
        <button type="button" onClick={(e) => show("test_drive", e.currentTarget)} className={secondary}>
          Test drive
        </button>
        <button type="button" onClick={(e) => show("reserve", e.currentTarget)} className={secondary}>
          Reserve
        </button>
      </div>
      <LeadDialog
        title={copy.title}
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        <LeadForm type={type} car={car} variant="dialog" submitLabel={copy.submit} success={{ heading: copy.heading, body: copy.body(car) }}>
          {({ bind }) => (
            <>
              <TypePicker value={type} onChange={setType} />
              {type === "reserve" && <p className="text-meta text-text-2">This is a request, not a hold. We will call you to confirm. No payment is taken.</p>}
              <ContactFields bind={bind} />
              <CarFields type={type} bind={bind} />
              <Field {...bind("message")} label={type === "reserve" ? "Note" : "Message"} optional multiline maxLength={LIMITS.message} />
            </>
          )}
        </LeadForm>
      </LeadDialog>
    </>
  );
}
