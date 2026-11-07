"use client";

import { ChevronDownIcon } from "@/components/stock/icons";
import { CONTACT_ERROR, LIMITS } from "@/lib/leads/constants";
import type { FieldBinding } from "./LeadForm";

// Inputs read as wells: ink inside a dialog (the dialog is card), card on a page (UI-SPEC Color).
const control = "w-full rounded-control border border-control bg-card text-body in-[dialog]:bg-surface aria-[invalid=true]:border-destructive";

type InputProps = Pick<React.InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete" | "maxLength" | "enterKeyHint" | "inputMode" | "min">;

// One labelled control with its helper and error lines (UI-SPEC Form fields, Accessibility baseline).
// invalid and describedBy let ContactFields mark Phone with the one contact error that shows under Email.
export function Field({
  label,
  optional,
  helper,
  multiline,
  options,
  invalid,
  describedBy,
  id,
  name,
  value,
  onChange,
  error,
  ...input
}: FieldBinding & InputProps & { label: string; optional?: boolean; helper?: string; multiline?: boolean; options?: { value: string; label: string }[]; invalid?: boolean; describedBy?: string }) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const common = {
    id,
    name,
    value,
    "aria-invalid": error || invalid ? true : undefined,
    "aria-describedby": [helperId, errorId, describedBy].filter(Boolean).join(" ") || undefined,
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-meta font-semibold">
        {label}
        {optional && <span className="font-normal text-text-2"> (optional)</span>}
      </label>
      {options ? (
        <span className="relative">
          <select {...common} onChange={(e) => onChange(e.target.value)} className={`${control} h-12 appearance-none pl-4 pr-10`}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-3 h-6 w-6" />
        </span>
      ) : multiline ? (
        <textarea {...common} maxLength={input.maxLength} enterKeyHint="enter" onChange={(e) => onChange(e.target.value)} className={`${control} min-h-28 resize-none px-4 py-3`} />
      ) : (
        <input {...common} {...input} onChange={(e) => onChange(e.target.value)} className={`${control} h-12 px-4`} />
      )}
      {helper && (
        <p id={helperId} className="text-meta text-text-2">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-meta text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Name, then phone and email, at least one of which is needed (D-12).
export function ContactFields({ bind }: { bind(name: string): FieldBinding }) {
  const email = bind("email");
  const both = email.error === CONTACT_ERROR;
  return (
    <>
      <Field {...bind("name")} label="Name" autoComplete="name" maxLength={LIMITS.name} enterKeyHint="next" />
      <p className="text-meta text-text-2">Add a phone number or an email, so we can reply.</p>
      <Field {...bind("phone")} label="Phone" type="tel" autoComplete="tel" maxLength={LIMITS.phone} enterKeyHint="next" invalid={both} describedBy={both ? `${email.id}-error` : undefined} />
      <Field {...email} label="Email" type="email" autoComplete="email" maxLength={LIMITS.email} enterKeyHint="next" />
    </>
  );
}
