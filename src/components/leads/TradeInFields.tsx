"use client";

import { SearchIcon } from "@/components/stock/icons";
import { BAD_KM, BAD_REG, KM_PATTERN, LIMITS, REG_PATTERN } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding, FormStep, PhotoBinding } from "./LeadForm";
import { PhotoPicker } from "./PhotoPicker";

// The trade-in is four short steps. The first checks its two required answers here, with the same rules and words as the server;
// the server still checks everything when the last step is sent.
export const TRADE_IN_STEPS: FormStep[] = [
  {
    title: "Your car",
    fields: ["reg", "mileage", "make", "model", "year"],
    check: (v) => {
      const found: Record<string, string[]> = {};
      if (!REG_PATTERN.test((v.reg ?? "").trim().toUpperCase())) found.reg = [BAD_REG];
      if (!KM_PATTERN.test((v.mileage ?? "").replaceAll(",", "").trim())) found.mileage = [BAD_KM];
      return found;
    },
  },
  { title: "Condition", fields: ["message"] },
  { title: "Photos", fields: ["photos"] },
  { title: "Your details", fields: ["name", "phone", "email", "consent"] },
];

const GUIDE_PHOTOS = ["The front and the back", "Both sides", "The inside, and the dashboard showing the mileage", "Each wheel and tyre", "Every dent, scratch or mark, close up"];
const GUIDE_NOTES = ["Warning lights or faults", "Accident or body damage", "Service history and NCT", "Number of owners"];

// Every step stays in the form (hidden, not removed) so the send reads all of it; only the current one shows.
export function TradeInFields({ bind, photos, step }: { bind(name: string): FieldBinding; photos: PhotoBinding; step: number }) {
  return (
    <>
      <div hidden={step !== 0} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Start with the registration and the mileage. The rest helps us value it but you can leave it out.</p>
        <Field {...bind("reg")} label="Registration" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="191-KY-1234" enterKeyHint="next" />
        {/* A stub for now: it shows the option is coming (#114). Nothing is looked up and nothing is sent. */}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" aria-disabled="true" onClick={(e) => e.preventDefault()} className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-control border border-dashed border-control px-4 text-meta font-semibold text-text-2">
            <SearchIcon className="size-5" />
            Look Up My Car
          </button>
          <span className="text-meta text-text-2">Coming soon: fill in the details from your registration.</span>
        </div>
        <Field {...bind("mileage")} label="Mileage" inputMode="numeric" suffix="km" maxLength={9} enterKeyHint="next" />
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
        <p className="text-body text-text-2">Good photos give the best valuation. Include all damage, even small marks.</p>
        <ul className="flex flex-col gap-1 text-meta">
          {GUIDE_PHOTOS.map((n) => (
            <li key={n} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              {n}
            </li>
          ))}
        </ul>
        <PhotoPicker {...photos} />
      </div>

      <div hidden={step !== 3} className="flex flex-col gap-4">
        <p className="text-body text-text-2">We will contact you with a valuation. It is an estimate until we have seen the car.</p>
        <ContactFields bind={bind} />
      </div>
    </>
  );
}
