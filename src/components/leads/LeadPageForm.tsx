"use client";

import { LeadForm } from "./LeadForm";
import { SourcingFields } from "./SourcingFields";
import { TradeInFields } from "./TradeInFields";

// LeadForm takes its fields as a render function, which a server page cannot pass, so pages name the type and this picks the fields.
const FIELDS = { sourcing: SourcingFields, trade_in: TradeInFields };

export function LeadPageForm({ type, ...props }: { type: keyof typeof FIELDS; submitLabel: string; success: { heading: string; body: string } }) {
  const Fields = FIELDS[type];
  return (
    <LeadForm type={type} variant="page" {...props}>
      {({ bind }) => <Fields bind={bind} />}
    </LeadForm>
  );
}
