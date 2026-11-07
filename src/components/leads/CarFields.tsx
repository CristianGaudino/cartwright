"use client";

import { useId } from "react";
import { CheckIcon } from "@/components/stock/icons";
import { TIMES, tomorrow } from "@/lib/leads/constants";
import { Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

export type CarLeadType = "enquiry" | "test_drive" | "reserve";

const press = "active:scale-[0.97] motion-reduce:active:scale-100";
const TYPES: { value: CarLeadType; label: string }[] = [
  { value: "enquiry", label: "Enquire" },
  { value: "test_drive", label: "Test drive" },
  { value: "reserve", label: "Reserve" },
];

// The Phase 1 segmented control (StockFilters Transmission) as a real radiogroup of native radios (D-10).
export function TypePicker({ value, onChange }: { value: CarLeadType; onChange(t: CarLeadType): void }) {
  const name = useId();
  return (
    <fieldset role="radiogroup" className="min-w-0">
      <legend className="mb-2 text-meta font-semibold">What would you like to do?</legend>
      <div className="grid grid-cols-3 overflow-hidden rounded-control border border-control">
        {TYPES.map((t) => {
          const on = value === t.value;
          return (
            <label key={t.value} className="relative flex">
              <input type="radio" name={name} value={t.value} checked={on} onChange={() => onChange(t.value)} className="peer sr-only" />
              <span
                className={`flex min-h-11 w-full items-center justify-center gap-1 whitespace-nowrap px-2 text-meta font-semibold peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 ${press} ${
                  on ? "bg-accent text-white" : "bg-card"
                }`}
              >
                {on && <CheckIcon className="h-4 w-4 shrink-0" />}
                {t.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Fields only a test drive has (D-11). Reserve has none: its hint sits above the contact fields. No opening hours anywhere.
export function CarFields({ type, bind }: { type: CarLeadType; bind(name: string): FieldBinding }) {
  if (type !== "test_drive") return null;
  const time = bind("preferredTime");
  return (
    <div className="flex flex-col gap-4">
      <Field {...bind("preferredDay")} label="Preferred day" optional type="date" min={tomorrow()} />
      <Field {...time} value={time.value || "any"} label="Preferred time" optional options={Object.entries(TIMES).map(([value, label]) => ({ value, label }))} />
      <p className="text-meta text-text-2">We will call to confirm a time.</p>
    </div>
  );
}
