"use client";

import { LIMITS, PHOTO_LIMITS } from "@/lib/leads/constants";
import { PriceRange } from "@/components/PriceRange";
import { ContactFields, Field } from "./Field";
import type { FieldBinding, FormStep, PhotoBinding } from "./LeadForm";
import { PhotoPicker } from "./PhotoPicker";

// Find a car is four short steps, like the trade-in. What is typed is checked with the server's own rules (LeadForm runs validate.ts for the
// step's fields); the photos are optional, so no step check.
export const SOURCING_STEPS: FormStep[] = [
  { title: "The Car", fields: ["make", "model", "budgetMax"] },
  { title: "What You Want", fields: ["message"] },
  { title: "Photos", fields: ["photos"] },
  { title: "Your Details", fields: ["name", "phone", "email", "consent"] },
];

const HELPS = ["Year, fuel and gearbox you prefer", "Colour, mileage or extras you must have", "Anything you want to avoid"];

// Every step stays in the form (hidden, not removed) so the send reads all of it; only the current one shows.
export function SourcingFields({ bind, photos, step }: { bind(name: string): FieldBinding; photos: PhotoBinding; step: number }) {
  const budget = bind("budgetMax");
  return (
    <>
      <div hidden={step !== 0} className="flex flex-col gap-4">
        <p className="text-body text-text-2">The make and model if you know them, or just the kind of car. Then your top budget.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field {...bind("make")} label="Make" optional maxLength={60} enterKeyHint="next" />
          <Field {...bind("model")} label="Model" optional maxLength={60} enterKeyHint="next" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-meta font-semibold">Budget Up To</span>
          <PriceRange maxOnly max={budget.value ? Number(budget.value) : undefined} onCommit={(_, max) => budget.onChange(max ? String(max) : "")} />
          {budget.error && <p className="text-meta text-destructive">{budget.error}</p>}
        </div>
      </div>

      <div hidden={step !== 1} className="flex flex-col gap-4">
        <p className="text-body text-text-2">The more we know, the better the match.</p>
        <Field {...bind("message")} label="What are you looking for?" multiline maxLength={LIMITS.message} />
        <ul className="flex flex-col gap-1 text-meta text-text-2">
          {HELPS.map((h) => (
            <li key={h} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              {h}
            </li>
          ))}
        </ul>
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Got a car in mind? Add photos of it, or of one like it. Up to {PHOTO_LIMITS.sourcing.max}, and you can skip this.</p>
        <PhotoPicker {...photos} max={PHOTO_LIMITS.sourcing.max} />
      </div>

      <div hidden={step !== 3} className="flex flex-col gap-4">
        <p className="text-body text-text-2">If we find a match, we&apos;ll get in touch. No obligation.</p>
        <ContactFields bind={bind} />
      </div>
    </>
  );
}
