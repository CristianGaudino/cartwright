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

// Keystrokes that would not make a number are refused, so the fields only ever hold digits.
const WHOLE = /^\d{0,6}$/;
const take = (re: RegExp, set: (v: string) => void) => (v: string) => {
  v = v.replaceAll(",", "");
  if (re.test(v)) set(v);
};

export type FinanceCar = CarSummary & { priceEur: number };

// FIN-01, FIN-02, D-16. An estimate, worked out in the browser on each keystroke from quote(), with no request. The rate is the
// dealer's, set in finance.config.ts: the buyer picks a deposit and a term, never a rate. The real amount comes from the lender.
// `car` is a car page's own car (its price is fixed). `cars` is the /finance page's list to pick from; with none picked the
// buyer types a price. Apply is secondary on a car page (Enquire is its accent) and the page's accent on /finance.
export function FinanceCalculator({ car: fixed, cars }: { car?: FinanceCar; cars?: FinanceCar[] }) {
  const uid = useId();
  const d = FINANCE.defaults;
  const [carId, setCarId] = useState("");
  const car = fixed ?? cars?.find((c) => c.id === carId);
  const [price, setPrice] = useState(String(d.priceEur));
  // A car cheaper than the default deposit starts at no deposit, so its page never opens on an error.
  const [deposit, setDeposit] = useState(String(fixed && fixed.priceEur <= d.depositEur ? 0 : d.depositEur));
  const [term, setTerm] = useState(String(d.termMonths));
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, string>>();
  const opener = useRef<HTMLButtonElement>(null);

  const priceEur = car ? car.priceEur : Number(price);
  const depositEur = Number(deposit); // blank is no deposit
  const priceError = !car && !(price !== "" && financeable(priceEur)) ? "Enter a price between €1,000 and €250,000." : undefined;
  const depositError = !priceError && depositEur >= priceEur ? "Deposit must be less than the price." : undefined;
  const q = quote(priceEur, depositEur, Number(term), d.aprPct);
  // A car cheaper than the deposit in the box would open on an error, so it starts at no deposit (as a car page does).
  const pickCar = (id: string) => {
    setCarId(id);
    const picked = cars?.find((c) => c.id === id);
    if (picked && picked.priceEur <= depositEur) setDeposit("0");
  };

  const field = (name: string, value: string, onChange: (v: string) => void, error?: string) => ({ id: `${uid}-${name}`, name, value, onChange, error });
  const carOptions = [{ value: "", label: "No car, just estimate a price" }, ...(cars ?? []).map((c) => ({ value: c.id, label: `${c.title}, ${c.price}` }))];

  return (
    <>
      {/* The inputs on the left and the result on the right from 1024px (the mockup); stacked below that. */}
      <div data-wells className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-4 sm:p-6">
          {/* Removed in one place: set placeholder to false in finance.config.ts. Never hidden with CSS (D-16). */}
          {FINANCE.placeholder && <PlaceholderPill>Placeholder figures</PlaceholderPill>}
          <div className="grid grid-cols-1 gap-4">
            {cars && cars.length > 0 && <Field {...field("car", carId, pickCar)} label="Car" options={carOptions} />}
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
            <p className="text-meta text-text-2">Worked out at an example rate of {d.aprPct}% APR. Your real rate is set by the lender.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-4 sm:p-6">
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            {q ? (
              <>
                <p className="text-meta text-text-2">Estimated monthly payment</p>
                <p className="text-display font-semibold tabular-nums">
                  About {formatPrice(q.monthlyEur)}<span className="text-body font-normal text-text-2"> a month</span>
                </p>
                <dl className="flex flex-col gap-1 text-meta">
                  {(
                    [
                      ["Amount borrowed", q.borrowedEur],
                      ["Estimated total to repay", q.totalEur],
                      ["Estimated interest", q.interestEur],
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
          <p className="rounded-control bg-surface p-3 text-meta">
            This is an estimate, not an approval. What you are offered depends on your circumstances, such as your age, income and credit history. Send your details and we will contact you with the real amounts.
          </p>
          <button
            ref={opener}
            type="button"
            onClick={() => {
              setPrefill(car ? { deposit, term } : { price, deposit, term }); // a new object on each open refreshes just these fields in the form
              setOpen(true);
            }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-control px-6 font-semibold ${press} ${fixed ? "border border-control bg-card text-text" : "bg-accent text-white"}`}
          >
            Start Your Application
            <ArrowRightIcon className="size-5" />
          </button>
        </div>
      </div>
      <p className="text-meta text-text-2">{FINANCE.notice}</p>
      <LeadDialog
        title="Start Your Application"
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
          submitLabel="Send Details"
          success={{ heading: "Thanks, we have your details.", body: "This is not an approval. We will contact you with the real amounts and the next steps." }}
        >
          {({ bind }) => <FinanceFields bind={bind} />}
        </LeadForm>
      </LeadDialog>
    </>
  );
}
