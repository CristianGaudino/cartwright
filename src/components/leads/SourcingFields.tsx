"use client";

import { LIMITS } from "@/lib/leads/constants";
import { formatPrice } from "@/lib/stock/format";
import { BUDGETS } from "@/lib/stock/types";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

const BUDGET_OPTIONS = [{ value: "", label: "Any" }, ...BUDGETS.map((v) => ({ value: String(v), label: formatPrice(v) }))];

// /find-a-car fields in UI-SPEC order: the car, then the required message, then contact (LED-05).
export function SourcingFields({ bind }: { bind(name: string): FieldBinding }) {
  return (
    <>
      <Field {...bind("make")} label="Make" optional maxLength={60} enterKeyHint="next" />
      <Field {...bind("model")} label="Model" optional maxLength={60} enterKeyHint="next" />
      <Field {...bind("budgetMax")} label="Budget up to" options={BUDGET_OPTIONS} />
      <Field {...bind("message")} label="What are you looking for?" helper="Year, fuel, colour or anything else that matters." multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </>
  );
}
