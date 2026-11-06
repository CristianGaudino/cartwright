"use client";

import { CONSENT } from "@/lib/leads/schema";
import type { FieldBinding } from "./LeadForm";

// The one consent row every form uses (D-06): unticked by default, one plain line, no marketing option anywhere (D-07).
export function ConsentRow({ id, name, value, onChange, error }: FieldBinding) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-start gap-3 py-1">
        <input
          id={id}
          type="checkbox"
          name={name}
          value="yes"
          checked={value === "yes"}
          onChange={(e) => onChange(e.target.checked ? "yes" : "")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-5 shrink-0 accent-accent"
        />
        <label htmlFor={id} className="text-meta">
          {CONSENT.text}{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="underline">
            Privacy policy<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </label>
      </div>
      {error && (
        <p id={errorId} className="text-meta text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
