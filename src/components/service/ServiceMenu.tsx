"use client";

import { useMemo, useState } from "react";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { CheckIcon } from "@/components/stock/icons";
import { accentButton, subTitle } from "@/components/ui";

export type Service = { readonly name: string; readonly blurb: string; readonly types: readonly string[] };

// What we do, as a row of cards. A card opens to say more about that service and offers the message form, which stays closed until
// asked for: the contact page already takes a general message.
export function ServiceMenu({ services }: { services: readonly Service[] }) {
  const [open, setOpen] = useState<string>();
  const [ask, setAsk] = useState(false);
  const current = services.find((s) => s.name === open);
  // One object per service, so the form is not told to refill its message on every render.
  const prefill = useMemo(() => ({ message: `I would like to ask about ${open?.toLowerCase()}.` }), [open]);
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
                  setAsk(false);
                }}
                className={`flex h-full w-full flex-col items-start gap-2 rounded-card border p-5 text-left transition-colors ${on ? "border-accent bg-card" : "border-hairline bg-card hover:bg-hairline/50"}`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-heading font-semibold">{s.name}</span>
                  <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full text-heading ${on ? "bg-accent text-white" : "bg-accent/15 text-accent"}`}>
                    {on ? "−" : "+"}
                  </span>
                </span>
                <span className="text-meta text-text-2">{s.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div id="service-detail">
        {current && (
          <div className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-5 sm:p-6">
            <h3 className={subTitle}>{current.name}: what we can do</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.types.map((t) => (
                <li key={t} className="flex items-center gap-2 text-body">
                  <CheckIcon className="size-4 shrink-0 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
            {!ask ? (
              <button type="button" onClick={() => setAsk(true)} className={`self-start ${accentButton} w-full sm:w-auto sm:min-w-60`}>
                Ask About {current.name}
              </button>
            ) : (
              <div data-wells className="flex flex-col gap-4 rounded-card border border-hairline p-4 sm:p-5">
                <h4 className="text-body font-semibold">Tell us what your car needs</h4>
                <LeadPageForm
                  key={current.name}
                  type="general"
                  prefill={prefill}
                  submitLabel="Send Message"
                  success={{ heading: "Thanks, we have your message.", body: "We will get back to you." }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
