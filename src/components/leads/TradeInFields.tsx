"use client";

import { SearchIcon } from "@/components/stock/icons";
import { LIMITS, PHOTO_MIN_COUNT, PHOTO_MIN_ERROR, PHOTO_SLOTS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding, FormStep, PhotoBinding } from "./LeadForm";
import { PhotoPicker } from "./PhotoPicker";

// The trade-in is four short steps. What is typed is checked with the server's own rules (LeadForm runs validate.ts for the step's fields);
// the photos are the one thing the rules cannot see in the typed values, so their count is checked here, with the server's number.
export const TRADE_IN_STEPS: FormStep[] = [
  { title: "Your Car", fields: ["reg", "mileage", "make", "model", "year"] },
  { title: "Condition", fields: ["message"] },
  { title: "Photos", fields: ["photos"], check: ({ photos }) => (photos < PHOTO_MIN_COUNT ? { photos: [PHOTO_MIN_ERROR] } : undefined) },
  { title: "Your Details", fields: ["name", "phone", "email", "consent"] },
];

const GUIDE_NOTES = ["Warning lights or faults", "Accident or body damage", "Service history and NCT", "Number of owners"];

// The registration lookup is a stub for now (#114): it shows the option is coming. Nothing is looked up and nothing is sent.
const LookUp = (
  <button
    type="button"
    aria-disabled="true"
    title="Registration lookup is coming soon"
    onClick={(e) => e.preventDefault()}
    className="inline-flex h-12 shrink-0 cursor-not-allowed items-center gap-2 rounded-r-control border border-l-0 border-control bg-card px-4 text-meta font-semibold text-text-2"
  >
    <SearchIcon className="size-5" />
    Look Up
  </button>
);

// Every step stays in the form (hidden, not removed) so the send reads all of it; only the current one shows.
export function TradeInFields({ bind, photos, step }: { bind(name: string): FieldBinding; photos: PhotoBinding; step: number }) {
  return (
    <>
      <div hidden={step !== 0} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Start with the registration and the mileage. The rest helps us value it but you can leave it out.</p>
        <Field
          {...bind("reg")}
          label="Registration"
          required
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          placeholder="191-KY-1234"
          enterKeyHint="next"
          helper="Looking up your car from its registration is coming soon."
          action={LookUp}
        />
        <Field {...bind("mileage")} label="Mileage" required inputMode="numeric" suffix="km" maxLength={9} enterKeyHint="next" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field {...bind("make")} label="Make" optional maxLength={60} enterKeyHint="next" />
          <Field {...bind("model")} label="Model" optional maxLength={60} enterKeyHint="next" />
          <Field {...bind("year")} label="Year" optional inputMode="numeric" maxLength={4} enterKeyHint="next" />
        </div>
      </div>

      <div hidden={step !== 1} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Tell us how the car really is. A valuation can change when we see it, and being upfront means no surprises.</p>
        <ul className="flex flex-col gap-1 text-meta">
          {GUIDE_NOTES.map((n) => (
            <li key={n} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              {n}
            </li>
          ))}
        </ul>
        <Field {...bind("message")} label="Known issues or anything we should know" optional multiline maxLength={LIMITS.message} />
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-4">
        <p className="text-body text-text-2">
          Add at least {PHOTO_MIN_COUNT} photos. More is better: every angle, and every mark or dent, even a small one. Tap a slot to add its photo.
        </p>
        <PhotoPicker {...photos} slots={PHOTO_SLOTS} min={PHOTO_MIN_COUNT} />
      </div>

      <div hidden={step !== 3} className="flex flex-col gap-4">
        <p className="text-body text-text-2">We&apos;ll contact you with a valuation. It&apos;s an estimate until we&apos;ve seen the car.</p>
        <ContactFields bind={bind} />
      </div>
    </>
  );
}
