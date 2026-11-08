"use client";

import { useMemo, useState } from "react";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { CheckIcon } from "@/components/stock/icons";
import { card, subTitle } from "@/components/ui";

export type Service = { readonly name: string; readonly blurb: string; readonly types: readonly string[] };

// What we do, as a row of cards. A card opens a panel under the row (it slides open): what that service covers on the left, as a list with
// the checks down the left edge, and the message form, already open, on the right.
export function ServiceMenu({ services }: { services: readonly Service[] }) {
  const [open, setOpen] = useState<string>();
  const [last, setLast] = useState<string>(); // what the panel still shows while it slides shut
  const current = services.find((s) => s.name === (open ?? last));
  // One object per service, so the form is not told to refill its message on every render.
  const prefill = useMemo(() => ({ message: `I'd like to ask about ${(open ?? last)?.toLowerCase()}.` }), [open, last]);
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {services.map((s) => {
          const on = s.name === open;
          return (
            <li key={s.name}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls="service-detail"
                onClick={() => {
                  setOpen(on ? undefined : s.name);
                  if (!on) setLast(s.name);
                }}
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
            </li>
          );
        })}
      </ul>
      {/* Slides open and shut: a grid row that goes from 0fr to 1fr, so the height needs no measuring. */}
      <div id="service-detail" className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          {current && (
            <div className={`grid grid-cols-1 gap-6 ${card} p-5 sm:p-6 lg:grid-cols-2 lg:gap-10`}>
              <div className="flex flex-col gap-4">
                <h3 className={subTitle}>{current.name}: What We Do</h3>
                <ul className="flex flex-col gap-3">
                  {current.types.map((t) => (
                    <li key={t} className="flex items-center gap-3 text-body">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <CheckIcon className="size-4" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-wells className="flex flex-col gap-4 rounded-card border border-hairline p-4 sm:p-5">
                <h4 className="text-body font-semibold">Tell us what your car needs</h4>
                <LeadPageForm
                  key={current.name}
                  type="general"
                  prefill={prefill}
                  submitLabel="Send Message"
                  success={{ heading: "Thanks, we have your message.", body: "We'll get back to you." }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
