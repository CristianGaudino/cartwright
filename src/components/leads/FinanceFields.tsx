"use client";

import { EMPLOYMENT, LIMITS } from "@/lib/leads/constants";
import { FINANCE } from "@/lib/finance/finance.config";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

export const TERM_OPTIONS = FINANCE.terms.map((t) => ({ value: String(t), label: `${t} months` })); // the calculator's too
const JOBS = [{ value: "", label: "Choose one" }, ...Object.entries(EMPLOYMENT).map(([value, label]) => ({ value, label }))];

// The finance application in UI-SPEC order (D-17): contact, deposit and term from the calculator, employment, message.
export function FinanceFields({ bind }: { bind(name: string): FieldBinding }) {
  return (
    <>
      <ContactFields bind={bind} />
      <Field {...bind("deposit")} label="Deposit" prefix="€" inputMode="numeric" autoComplete="off" enterKeyHint="next" />
      <Field {...bind("term")} label="Term" options={TERM_OPTIONS} />
      <p className="text-meta text-text-2">We don&apos;t ask for income, date of birth or bank details.</p>
      <Field {...bind("employment")} label="Employment status" options={JOBS} />
      <Field {...bind("message")} label="Anything else we should know?" optional multiline maxLength={LIMITS.message} />
    </>
  );
}
