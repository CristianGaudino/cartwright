"use client";

import { GeneralFields } from "./GeneralFields";
import { LeadForm } from "./LeadForm";
import { SOURCING_STEPS, SourcingFields } from "./SourcingFields";
import { TRADE_IN_STEPS, TradeInFields } from "./TradeInFields";

// LeadForm takes its fields as a render function, which a server page cannot pass, so pages name the type and this picks the fields.
const FIELDS = { general: GeneralFields, sourcing: SourcingFields, trade_in: TradeInFields };

const STEPS = { general: undefined, sourcing: SOURCING_STEPS, trade_in: TRADE_IN_STEPS };

export function LeadPageForm({ type, ...props }: { type: keyof typeof FIELDS; submitLabel: string; success: { heading: string; body: string }; prefill?: Record<string, string> }) {
  const Fields = FIELDS[type];
  return (
    <LeadForm type={type} variant="page" back={type === "general" ? { href: "/", label: "Back to Home" } : undefined} steps={STEPS[type]} {...props}>
      {(form) => <Fields {...form} />}
    </LeadForm>
  );
}
