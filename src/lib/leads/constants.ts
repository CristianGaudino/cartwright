import { OPENING_HOURS, SITE_NAME } from "../site";

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

// The kinds of car a find-a-car request can name, and what it says when make, model and type are all empty.
export const SOURCING_BODIES = ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible", "MPV", "Pickup", "Van"] as const;
export const SOURCING_CAR_ERROR = "Add a make, a model or a type of car.";
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

// Test drives (#166): a request for a day and a time, which the dealer calls to confirm. The days and hours come from OPENING_HOURS, so they
// never disagree with the hours on the site. Slots start an hour after we open, an hour apart, and none starts later than an hour before we
// close. Days run from today for daysAhead days, but a slot must start at least an hour from now (noticeMs). Times are Irish time wherever
// the buyer is. Slots are an hour apart, so the unique (car, start) index alone keeps two drives on one car at least an hour apart: no
// check-then-insert race. One person (the same phone or the same email) holds at most one pending request per car and maxPending in all.
export const TEST_DRIVE = { daysAhead: 14, stepMinutes: 60, noticeMs: 3_600_000, maxPending: 3 } as const;
export const BAD_DRIVE_DAY = "Choose a day from the list.";
export const BAD_DRIVE_TIME = "Choose a time from the list.";
export const DRIVE_NOTICE_ERROR = "Choose a time at least an hour from now.";
export const DRIVE_PHONE_ERROR = "Add a phone number so we can call to confirm.";
export const DRIVE_TAKEN_ERROR = "That time was just taken. Choose another.";
export const DRIVE_AGAIN_ERROR = "This phone number or email already has a test drive request for this car. We'll call you to confirm it.";
export const DRIVE_FULL_ERROR = `This phone number or email has ${TEST_DRIVE.maxPending} test drive requests waiting. We'll call you about those first.`;

/** A phone number as digits with its country code, so "+353 87 123 4567", "087 123 4567" and "00353871234567" match. A national leading 0
 * is read as Irish. Only for comparing (drive_holds.phone_key): never shown or logged. */
export function phoneKey(v: string): string {
  const d = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) return d.replace(/^3530/, "353"); // "+353 (0)87" is still 87
  if (d.startsWith("00")) return phoneKey(`+${d.slice(2)}`);
  return d.startsWith("0") ? `353${d.slice(1)}` : d;
}
/** An email as compared for the same caps (drive_holds.email_key): trimmed and lowercased. Null when there is none. */
export const emailKey = (v?: string | null) => v?.trim().toLowerCase() || null;

const TZ = "Europe/Dublin";
const DAY_MS = 86_400_000;
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const noonUtc = (iso: string) => new Date(`${iso}T12:00:00Z`); // a day read at noon UTC, so no time zone moves it
const addDays = (iso: string, n: number) => new Date(noonUtc(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);

/** An instant as Irish wall time, "2026-11-25 10:30". */
export function dublinSlot(ms: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
/** Irish wall time as an instant. NaN for a time the clocks skip. */
export function dublinMs(date: string, time: string): number {
  // shortcut: Ireland is only ever UTC+1 or UTC+0; a site in another zone needs a real offset lookup.
  for (const h of [1, 0]) {
    const ms = Date.parse(`${date}T${time}:00Z`) - h * 3_600_000;
    if (dublinSlot(ms) === `${date} ${time}`) return ms;
  }
  return NaN;
}

/** The times a test drive can start on a day: hourly from an hour after opening, none later than an hour before closing. Empty on a closed day. */
export function driveTimes(iso: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(noonUtc(iso).getTime())) return [];
  const h = OPENING_HOURS[(noonUtc(iso).getUTCDay() + 6) % 7]; // OPENING_HOURS starts on Monday
  if (!h?.opens || !h.closes) return [];
  const out: string[] = [];
  for (let m = mins(h.opens) + 60; m <= mins(h.closes) - 60; m += TEST_DRIVE.stepMinutes) out.push(hhmm(m));
  return out;
}
/** The times on a day that still give an hour's notice. */
export const openDriveTimes = (iso: string, now = Date.now()) => driveTimes(iso).filter((t) => dublinMs(iso, t) >= now + TEST_DRIVE.noticeMs);
/** Whether a day is open and from today (Irish date) to daysAhead days on. Whether its time gives notice is checked with the time. */
export function isDriveDay(iso: string, now = new Date()): boolean {
  const today = dublinSlot(now.getTime()).slice(0, 10);
  return iso >= today && iso <= addDays(today, TEST_DRIVE.daysAhead) && driveTimes(iso).length > 0;
}
/** The days the form offers: from today, if it still has a time an hour away, to daysAhead days on. */
export function driveDays(now = new Date()): string[] {
  const today = dublinSlot(now.getTime()).slice(0, 10);
  const out: string[] = [];
  for (let i = 0; i <= TEST_DRIVE.daysAhead; i++) if (openDriveTimes(addDays(today, i), now.getTime()).length) out.push(addDays(today, i));
  return out;
}
/** "Tue 25 Nov", for the day list and the email subject. */
export const driveDayLabel = (iso: string, long = false) =>
  noonUtc(iso).toLocaleDateString("en-IE", { weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short", ...(long && { year: "numeric" }), timeZone: "UTC" }).replace(",", "");
