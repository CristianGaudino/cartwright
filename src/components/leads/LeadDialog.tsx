"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, PhoneIcon } from "@/components/stock/icons";
import { LIMITS } from "@/lib/leads/schema";
import { DEALER_TEL } from "@/lib/site";
import { LeadForm, TextField } from "./LeadForm";

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

// The car page action area, row 1 (UI-SPEC): Enquire takes the accent, Call now is secondary.
export function LeadActions({ car }: { car: CarSummary }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button ref={opener} type="button" onClick={() => setOpen(true)} className={`${action} bg-accent text-white`}>
          Enquire
        </button>
        <a href={`tel:${DEALER_TEL}`} className={`${action} border border-control bg-card text-text`}>
          <PhoneIcon />
          Call now
        </a>
      </div>
      <LeadDialog
        title="Enquire"
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        <LeadForm
          type="enquiry"
          car={car}
          variant="dialog"
          submitLabel="Send enquiry"
          success={{ heading: "Thanks, we have your enquiry.", body: `We will get back to you about the ${car.name}.` }}
        >
          {({ bind }) => (
            <>
              <TextField field={bind("name")} label="Name" autoComplete="name" maxLength={LIMITS.name} enterKeyHint="next" />
              <p className="text-meta text-text-2">Add a phone number or an email, so we can reply.</p>
              <TextField field={bind("phone")} label="Phone" type="tel" autoComplete="tel" maxLength={LIMITS.phone} enterKeyHint="next" />
              <TextField field={bind("email")} label="Email" type="email" autoComplete="email" maxLength={LIMITS.email} enterKeyHint="next" />
              <TextField field={bind("message")} label="Message" optional multiline maxLength={LIMITS.message} />
            </>
          )}
        </LeadForm>
      </LeadDialog>
    </>
  );
}
