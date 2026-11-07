// What the lead forms and the server share. No zod here: client components import this file, and pulling in
// schema.ts would ship zod to every car page.

// Change the version whenever the text changes: every lead stores the version it was sent under (D-06).
export const CONSENT = { version: "2026-11-06", text: "I agree to Carright using these details to reply to my request." } as const;
// D-04: leads are kept this long, then deleted (by hand per docs/lead-retention.md until #20). The dealer must confirm
// the period; /privacy and docs/lead-retention.md state it, so change all three together.
export const LEAD_RETENTION_MONTHS = 12;
export const LIMITS = { name: 100, phone: 30, email: 200, message: 1000 } as const;
// D-12: shown once, under Email; ContactFields marks both fields when it is set.
export const CONTACT_ERROR = "Add a phone number or an email.";

// YYYY-MM-DD for tomorrow in Ireland, where the dealer is, so the form's min and the server agree.
// One calendar day on from the Dublin date, not 24 hours on, which is wrong for the hour after the clocks go back.
export const tomorrow = (now = new Date()) => {
  const next = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(now) + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};
// Trade-in photos (D-13, caps proven in the 03-01 spike). PHOTO_MAX_MB is checked on the picked original before the phone
// shrinks it; the server enforces the stored and total caps, and next.config.ts's 18mb body cap sits just above the total.
export const PHOTO_MAX_COUNT = 12;
export const PHOTO_MAX_MB = 15;
export const PHOTO_STORED_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_TOTAL_MAX_BYTES = 16 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const photoError = (filename: string) => `${filename} is not a photo we can use. Use a JPEG, PNG or WebP under ${PHOTO_MAX_MB} MB.`;
export const PHOTO_COUNT_ERROR = `You can add up to ${PHOTO_MAX_COUNT} photos.`;
export const PHOTO_TOTAL_ERROR = "The photos are too big to send together. Remove one and try again.";

export const TIMES ={ any: "Any time", morning: "Morning", afternoon: "Afternoon" } as const;
// D-17: the only thing a finance application asks about the buyer's circumstances. No income, date of birth or bank details.
export const EMPLOYMENT = { employed: "Employed", self_employed: "Self-employed", retired: "Retired", student: "Student", other: "Other" } as const;
