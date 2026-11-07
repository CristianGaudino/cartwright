"use client";

import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding, PhotoBinding } from "./LeadForm";
import { PhotoPicker } from "./PhotoPicker";

// /sell-your-car fields in UI-SPEC order (LED-04). Plain fields, no reg lookup (D-14).
export function TradeInFields({ bind, photos }: { bind(name: string): FieldBinding; photos: PhotoBinding }) {
  return (
    <>
      <Field {...bind("reg")} label="Registration" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="191-KY-1234" enterKeyHint="next" />
      <Field {...bind("mileage")} label="Mileage" inputMode="numeric" suffix="km" maxLength={9} enterKeyHint="next" />
      <Field {...bind("make")} label="Make" optional maxLength={60} enterKeyHint="next" />
      <Field {...bind("model")} label="Model" optional maxLength={60} enterKeyHint="next" />
      <Field {...bind("year")} label="Year" optional inputMode="numeric" maxLength={4} enterKeyHint="next" />
      <PhotoPicker {...photos} />
      <ContactFields bind={bind} />
      <Field {...bind("message")} label="Anything else we should know?" optional multiline maxLength={LIMITS.message} />
    </>
  );
}
