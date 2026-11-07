"use client";

import { useId, useRef, useState } from "react";
import { Field } from "@/components/leads/Field";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { FinanceFields, TERM_OPTIONS } from "@/components/leads/FinanceFields";
import { LeadDialog } from "@/components/leads/LeadDialog";
import type { CarSummary } from "@/components/leads/LeadDialog";
import { LeadForm } from "@/components/leads/LeadForm";
import { FINANCE } from "@/lib/finance/finance.config";
import { financeable, quote } from "@/lib/finance/payment";
import { formatPrice } from "@/lib/stock/format";
import { ArrowRightIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";

// Keystrokes that would not make a number are refused, so the fields only ever hold digits (and one decimal for the APR).
const WHOLE = /^\d{0,6}$/;
const RATE = /^\d{0,2}(\.\d?)?$/;
const take = (re: RegExp, set: (v: string) => void) => (v: string) => {
  v = v.replaceAll(",", "");
  if (re.test(v)) set(v);
};

// FIN-01, FIN-02, D-16. Every figure is worked out in the browser on each keystroke from quote(), with no request.
// With a car the price is that car's, shown as text, and Apply is secondary (Enquire is the car page's accent);
// on /finance the buyer types the price and Apply is the page's accent.
export function FinanceCalculator({ car }: { car?: CarSummary & { priceEur: number } }) {
  const uid = useId();
  const d = FINANCE.defaults;
  const [price, setPrice] = useState(String(d.priceEur));
  // A car cheaper than the default deposit starts at no deposit, so its page never opens on an error.
  const [deposit, setDeposit] = useState(String(car && car.priceEur <= d.depositEur ? 0 : d.depositEur));
  const [term, setTerm] = useState(String(d.termMonths));
  const [apr, setApr] = useState(String(d.aprPct));
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, string>>();
  const opener = useRef<HTMLButtonElement>(null);

  const priceEur = car ? car.priceEur : Number(price);
  const depositEur = Number(deposit); // blank is no deposit
  const aprPct = apr === "" || apr === "." ? NaN : Number(apr);
  const priceError = !car && !(price !== "" && financeable(priceEur)) ?"Enter a price between €1,000 and €250,000." : undefined;
  const depositError = !priceError && depositEur >= priceEur ? "Deposit must be less than the price." : undefined;
  const aprError = !(aprPct >= 0 && aprPct <= 30) ? "Enter an APR between 0 and 30." : undefined;
  const q = quote(priceEur, depositEur, Number(term), aprPct);

  const field = (name: string, value: string, onChange: (v: string) => void, error?: string) => ({ id: `${uid}-${name}`, name, value, onChange, error });

  return (
    <>
      {/* The inputs on the left and the result on the right from 1024px (the mockup); stacked below that. */}
      <div data-wells className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-4 sm:p-6">
          {/* Removed in one place: set placeholder to false in finance.config.ts. Never hidden with CSS (D-16). */}
          {FINANCE.placeholder && <PlaceholderPill>Placeholder figures</PlaceholderPill>}
          <div className="grid grid-cols-1 gap-4">
            {car ? (
              <div className="flex flex-col gap-1">
                <p className="text-meta font-semibold">Price</p>
                <p className="flex h-12 items-center font-semibold tabular-nums">{car.price}</p>
              </div>
            ) : (
              <Field {...field("price", price, take(WHOLE, setPrice), priceError)} label="Price" prefix="€" inputMode="numeric" autoComplete="off" />
            )}
            <Field {...field("deposit", deposit, take(WHOLE, setDeposit), depositError)} label="Deposit" prefix="€" inputMode="numeric" autoComplete="off" />
            <Field {...field("term", term, setTerm)} label="Term" options={TERM_OPTIONS} />
            <Field {...field("apr", apr, take(RATE, setApr), aprError)} label="APR" suffix="%" inputMode="decimal" autoComplete="off" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-4 sm:p-6">
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            {q ? (
              <>
                <p className="text-meta text-text-2">Representative monthly payment</p>
                <p className="text-display font-semibold tabular-nums">{formatPrice(q.monthlyEur)} a month</p>
                <dl className="flex flex-col gap-1 text-meta">
                  {(
                    [
                      ["Amount borrowed", q.borrowedEur],
                      ["Total to repay", q.totalEur],
                      ["Interest", q.interestEur],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-text-2">{label}</dt>
                      <dd className="text-right tabular-nums">{formatPrice(value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="font-semibold">Check the figures you entered.</p>
            )}
          </div>
        <button
          ref={opener}
          type="button"
          onClick={() => {
            setPrefill(car ? { deposit, term } : { price, deposit, term }); // a new object on each open refreshes just these fields in the form
            setOpen(true);
          }}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-control px-6 font-semibold ${press} ${car ? "border border-control bg-card text-text" : "bg-accent text-white"}`}
        >
          Apply for Finance
          <ArrowRightIcon className="size-5" />
        </button>
        </div>
      </div>
      <p className="text-meta text-text-2">{FINANCE.notice}</p>
      <LeadDialog
        title="Apply for Finance"
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        <LeadForm
          type="finance"
          car={car}
          variant="dialog"
          prefill={prefill}
          submitLabel="Send Finance Application"
          success={{ heading: "Thanks, we have your application.", body: "We will contact you to go through the next steps." }}
        >
          {({ bind }) => <FinanceFields bind={bind} />}
        </LeadForm>
      </LeadDialog>
    </>
  );
}
