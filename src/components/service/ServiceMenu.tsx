"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { CheckIcon } from "@/components/stock/icons";
import { PhoneLink } from "@/components/PhoneLink";
import { card, subTitle } from "@/components/ui";

export type Service = { readonly name: string; readonly blurb: string; readonly types: readonly string[] };

// From 640px the cards sit in a row with one panel under it; on a phone each card opens its own panel right under itself. Only one of the
// two is ever mounted, so there is never a second form on the page.
const WIDE = "(min-width: 640px)";
const watchWide = (cb: () => void) => {
  const q = window.matchMedia(WIDE);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

// What a service covers, as ruled rows with a call prompt under them, and the message form beside them.
function Panel({ service }: { service: Service }) {
  // One object per service, so the form is not told to refill its message on every render.
  const prefill = useMemo(() => ({ message: `I'd like to ask about ${service.name.toLowerCase()}.` }), [service.name]);
  return (
    <div className={`grid grid-cols-1 gap-6 ${card} p-5 sm:p-6 lg:grid-cols-2 lg:gap-10`}>
      <div className="flex flex-col gap-6">
        <ul className="flex flex-col">
          {service.types.map((t) => (
            <li key={t} className="flex items-center gap-4 border-b border-hairline py-3 text-body last:border-b-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <CheckIcon className="size-5" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-auto rounded-control bg-accent/10 p-4 text-body">
          Prefer to talk? Call <PhoneLink className="font-semibold underline" />.
        </p>
      </div>
      <div data-wells className="flex flex-col gap-4 rounded-card border border-hairline p-4 sm:p-5">
        <h4 className="text-body font-semibold">Tell us what your car needs</h4>
        <LeadPageForm type="general" prefill={prefill} submitLabel="Send Message" success={{ heading: "Thanks, we have your message.", body: "We'll get back to you." }} />
      </div>
    </div>
  );
}

// Slides open and shut: a grid row that goes from 0fr to 1fr, so the height needs no measuring.
function Slide({ id, open, onClosed, children }: { id: string; open: boolean; onClosed(): void; children: React.ReactNode }) {
  return (
    <div id={id} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} inert={!open} onTransitionEnd={(e) => e.target === e.currentTarget && !open && onClosed()}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function ServiceMenu({ services }: { services: readonly Service[] }) {
  const [open, setOpen] = useState<string>();
  const [last, setLast] = useState<string>(); // the panel that is still sliding shut keeps its content until it has shut
  const wide = useSyncExternalStore(watchWide, () => window.matchMedia(WIDE).matches, () => false);
  const toggle = (name: string) => {
    if (open) setLast(open);
    setOpen(open === name ? undefined : name);
  };
  // On a phone the card that opened is brought up under the sticky header, so its form is on screen. It waits for the card above to slide
  // shut (which moves the page), and only moves the page when the card is low down or has gone under the header.
  useEffect(() => {
    if (wide || !open) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => {
      const card = document.getElementById(`service-card-${services.findIndex((s) => s.name === open)}`);
      const top = card?.getBoundingClientRect().top ?? 0;
      if (card && (top < 56 || top > window.innerHeight * 0.4)) card.scrollIntoView({ block: "start", behavior: reduced ? "instant" : "smooth" });
    }, reduced ? 0 : 320);
    return () => clearTimeout(t);
  }, [open, wide, services]);
  const current = services.find((s) => s.name === (open ?? last));
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {services.map((s, i) => {
          const on = s.name === open;
          const id = wide ? "service-detail" : `service-detail-${i}`;
          return (
            <li key={s.name} className="flex flex-col gap-3">
              <button
                id={`service-card-${i}`}
                type="button"
                aria-expanded={on}
                aria-controls={id}
                onClick={() => toggle(s.name)}
                className={`flex h-full w-full flex-col items-start gap-2 rounded-card border p-5 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.99] motion-reduce:transition-none ${on ? "border-accent bg-card" : "border-hairline bg-card hover:bg-hairline/50"}`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={subTitle}>{s.name}</span>
                  <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full text-heading transition-[transform,background-color] duration-300 motion-reduce:transition-none ${on ? "rotate-45 bg-accent text-white" : "bg-accent/15 text-accent"}`}>
                    +
                  </span>
                </span>
                <span className="text-meta text-text-2">{s.blurb}</span>
              </button>
              {!wide && (
                <Slide id={id} open={on} onClosed={() => setLast((l) => (l === s.name ? undefined : l))}>
                  {(on || s.name === last) && <Panel service={s} />}
                </Slide>
              )}
            </li>
          );
        })}
      </ul>
      {wide && (
        <Slide id="service-detail" open={Boolean(open)} onClosed={() => setLast(undefined)}>
          {current && <Panel key={current.name} service={current} />}
        </Slide>
      )}
    </div>
  );
}
