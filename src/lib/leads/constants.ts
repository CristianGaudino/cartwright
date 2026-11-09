import { SITE_NAME } from "../site";

// What the lead forms and the server share. No zod here: client components import this file, and pulling in
// schema.ts would ship zod to every car page.

// Change the version whenever the text changes: every lead stores the version it was sent under (D-06).
export const CONSENT = { version: "2026-11-06", text: `I agree to ${SITE_NAME} using these details to reply to my request.` } as const;
// D-04: leads are kept this long, then deleted by the daily purge (worker.mjs, docs/lead-retention.md). The dealer must confirm
// the period; /privacy and docs/lead-retention.md state it, so change all three together.
export const LEAD_RETENTION_MONTHS = 12;
export const LIMITS = { name: 100, phone: 30, email: 200, message: 1000 } as const;
// D-12: shown once, under Email; ContactFields marks both fields when it is set.
// Country codes for the phone field. Ireland first and the default; the rest are the places most buyers ring from.
export const COUNTRIES = [
  { code: "IE", name: "Ireland", dial: "+353", example: "87 123 4567" },
  { code: "GB", name: "United Kingdom", dial: "+44", example: "7400 123456" },
  { code: "US", name: "United States", dial: "+1", example: "202 555 0123" },
  { code: "PL", name: "Poland", dial: "+48", example: "512 345 678" },
  { code: "LT", name: "Lithuania", dial: "+370", example: "612 34567" },
  { code: "LV", name: "Latvia", dial: "+371", example: "2123 4567" },
  { code: "RO", name: "Romania", dial: "+40", example: "712 345 678" },
  { code: "DE", name: "Germany", dial: "+49", example: "1512 3456789" },
  { code: "FR", name: "France", dial: "+33", example: "6 12 34 56 78" },
  { code: "ES", name: "Spain", dial: "+34", example: "612 34 56 78" },
  { code: "IT", name: "Italy", dial: "+39", example: "312 345 6789" },
  { code: "NL", name: "Netherlands", dial: "+31", example: "6 12345678" },
  { code: "PT", name: "Portugal", dial: "+351", example: "912 345 678" },
  { code: "AU", name: "Australia", dial: "+61", example: "412 345 678" },
] as const;
export const BAD_PHONE = "Enter a phone number we can call, like 087 123 4567.";
export const BAD_IRISH_PHONE = "Irish numbers have 7 to 9 digits after +353, like 87 123 4567.";

/** Checks a phone number. Returns the message to show, or undefined if it is fine. Used by the server and, through it, the form. */
export function phoneError(v: string): string | undefined {
  if (!/^\+?[0-9 ()-]+$/.test(v)) return BAD_PHONE;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return BAD_PHONE; // E.164 allows at most 15 digits
  if (v.startsWith("+353")) {
    const national = digits.slice(3).replace(/^0/, "");
    if (national.length < 7 || national.length > 9) return BAD_IRISH_PHONE;
  }
}

export const CONTACT_ERROR = "Add a phone number or an email.";

// Trade-in photos (D-13, caps proven in the 03-01 spike). PHOTO_MAX_MB is checked on the picked original before the phone
// shrinks it; the server enforces the stored and total caps, and next.config.ts's 18mb body cap sits just above the total.
export const PHOTO_MAX_COUNT = 12;
export const PHOTO_MAX_MB = 15;
export const PHOTO_STORED_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_TOTAL_MAX_BYTES = 16 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const photoError = (filename: string) => `${filename} isn't a photo we can use. Use a JPEG, PNG or WebP under ${PHOTO_MAX_MB} MB.`;
export const photoCountError = (max: number) => `You can add up to ${max} photos.`;
export const PHOTO_COUNT_ERROR = photoCountError(PHOTO_MAX_COUNT);
export const PHOTO_TOTAL_ERROR = "The photos are too big to send together. Remove one and try again.";

// D-17: the only thing a finance application asks about the buyer's circumstances. No income, date of birth or bank details.
export const EMPLOYMENT = { employed: "Employed", self_employed: "Self-employed", retired: "Retired", student: "Student", other: "Other" } as const;

// The trade-in's two required answers, shared so the stepped form can check a step before the server sees it (D-14).
export const BAD_REG = "Enter the registration as shown on the car.";
export const BAD_KM = "Enter the mileage in km, numbers only.";
export const REG_PATTERN = /^[A-Z0-9 -]{1,12}$/;
export const KM_PATTERN = /^\d{1,6}$/;

// Trade-in photos: at least this many are needed to value a car, and more is better. The slots are what to photograph, in the order a
// buyer is asked for them (the photo step shows one empty slot for each, and the page lists them). Shared so the two never differ.
export const PHOTO_MIN_COUNT = 6;
export const PHOTO_MIN_ERROR = `Add at least ${PHOTO_MIN_COUNT} photos so we can value the car.`;
// Which lead types take photos, and how many: a trade-in needs the car shown (at least 6, up to 12); a find-a-car request may show up to 6
// cars the buyer likes, and none is fine. Read by the form and by the server, so they never differ.
export const PHOTO_LIMITS = { trade_in: { min: PHOTO_MIN_COUNT, max: PHOTO_MAX_COUNT }, sourcing: { min: 0, max: 6 } } as const;
export const PHOTO_SLOTS = ["Front", "Back", "Driver's Side", "Passenger's Side", "Interior Front", "Interior Back", "Dashboard and Mileage", "Any Damage"];
