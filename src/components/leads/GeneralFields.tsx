"use client";

import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

// /contact and /service: the message first, then contact.
export function GeneralFields({ bind }: { bind(name: string): FieldBinding }) {
  return (
    <>
      <Field {...bind("message")} label="How can we help?" required multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </>
  );
}
