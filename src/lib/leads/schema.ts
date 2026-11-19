import { z } from "zod";
import { FINANCE } from "@/lib/finance/finance.config";
import { PRICE_STOPS } from "@/lib/stock/types";
import { BAD_DRIVE_DAY, BAD_DRIVE_TIME, BAD_KM, DRIVE_PHONE_ERROR, driveDays, driveTimes, dublinMs, phoneError, BAD_REG, CONTACT_ERROR, EMPLOYMENT, KM_PATTERN, LIMITS, REG_PATTERN, SOURCING_BODIES, SOURCING_CAR_ERROR } from "./constants";

// The lead validation, run on the server. Client components import ./constants, never this file (it brings zod).

// One line only: a line break in a name or car text could pass for a new field (a fake "Phone:" line) in the dealer's plain-text email.
const oneLine = (s: z.ZodString) => s.regex(/^[^\r\n\u2028\u2029]*$/, "Keep this to one line.");
const tooLong = (n: number) => `Use ${n} characters or fewer.`;
// An empty or blank field counts as not given.
const given = <T extends z.ZodType>(s: T) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s);

// Loose on purpose (digits, spaces, plus, hyphens and brackets), but a +353 number must be the right length for Ireland.
const phone = (error?: string) =>
  z
    .string({ error })
    .trim()
    .max(LIMITS.phone, tooLong(LIMITS.phone))
    .superRefine((v, ctx) => {
      const message = phoneError(v);
      if (message) ctx.addIssue({ code: "custom", message });
    });

const contact = {
  clientRef: z.uuid(),
  sourcePath: z.string().regex(/^\/[A-Za-z0-9._~\-/]{0,200}$/),
  name: given(oneLine(z.string({ error: "Enter your name." }).trim().max(LIMITS.name, tooLong(LIMITS.name)))),
  phone: given(phone().optional()),
  email: given(z.email({ error: "Enter an email like name@example.com." }).max(LIMITS.email, tooLong(LIMITS.email)).optional()),
  message: given(z.string().max(LIMITS.message, tooLong(LIMITS.message)).optional()),
  consent: z.literal("yes", { error: "Tick the box to send your request." }),
};

// A general enquiry from /contact or /service: no car, only a required message (#58). The page it came from is the sourcePath.
const general = {
  message: given(z.string({ error: "Tell us how we can help." }).trim().max(LIMITS.message, tooLong(LIMITS.message))),
};

const carId = z.string().regex(/^\d{1,12}$/);

const carText = {
  make: given(oneLine(z.string().trim().max(60, tooLong(60))).optional()),
  model: given(oneLine(z.string().trim().max(60, tooLong(60))).optional()),
};
// No carId key on the car-less types (sourcing, general), so a forged one is dropped and snapshotCar stores no car (T-03-27).
const sourcing = {
  ...carText,
  bodyType: given(z.enum(SOURCING_BODIES, { error: "Choose a type from the list." }).optional()),
  budgetMax: given(
    z
      .string()
      .refine((v) => PRICE_STOPS.slice(1).includes(Number(v)), "Choose a budget on the slider.") // the slider's steps (PriceRange)
      .transform(Number)
      .optional(),
  ),
  message: given(z.string({ error: "Tell us what you're looking for." }).trim().max(LIMITS.message, tooLong(LIMITS.message))),
};

// D-14: plain fields, no reg lookup. Commas in the mileage are stripped; the year is the car's, so up to next year.
const nextYear = () => new Date().getUTCFullYear() + 1;
// A trade-in from a car page (/trade-in?car=) carries that car's id; snapshotCar reads the car again and refuses a sold one.
const tradeIn = {
  carId: given(carId.optional()),
  reg: given(z.string({ error: BAD_REG }).trim().toUpperCase().regex(REG_PATTERN, BAD_REG)),
  mileage: given(
    z
      .string({ error: BAD_KM })
      .transform((v) => v.replaceAll(",", "").trim())
      .pipe(z.string().regex(KM_PATTERN, BAD_KM))
      .transform(Number),
  ),
  ...carText,
  year: given(
    z
      .string()
      .regex(/^\d{4}$/, "Enter the year as 4 digits.")
      .transform(Number)
      .refine((y) => y >= 1900 && y <= nextYear(), { error: () => `Enter a year from 1900 to ${nextYear()}.` })
      .optional(),
  ),
};

// D-17: deposit, term and employment. An application is made from a car page, which sends the car's id; the price comes from the car.
const BAD_DEPOSIT = "Enter the deposit in euros, numbers only.";
const finance = {
  carId: given(carId.optional()),
  deposit: given(
    z
      .string({ error: BAD_DEPOSIT })
      .transform((v) => v.replaceAll(",", "").trim())
      .pipe(z.string().regex(/^\d{1,6}$/, BAD_DEPOSIT))
      .transform(Number)
      .refine((n) => n <= 250000, BAD_DEPOSIT),
  ),
  term: given(z.enum(FINANCE.terms.map(String) as [string, ...string[]], { error: "Choose a term from the list." }).transform(Number)),
  employment: given(z.enum(Object.keys(EMPLOYMENT) as [keyof typeof EMPLOYMENT], { error: "Choose an employment status." })),
};

// A test drive request (#166): the car, a day and a time on the slot grid, and a phone, since the dealer calls to confirm. The day is
// checked against yesterday's list too, so a form opened before midnight still sends its "tomorrow"; the time must not have passed.
const DAY_MS = 86_400_000;
const testDrive = {
  carId,
  phone: given(phone(DRIVE_PHONE_ERROR)),
  driveDate: given(z.string({ error: BAD_DRIVE_DAY }).refine((v) => driveDays().includes(v) || driveDays(new Date(Date.now() - DAY_MS)).includes(v), BAD_DRIVE_DAY)),
  driveTime: given(z.string({ error: BAD_DRIVE_TIME })),
};
const onTheGrid = (d: { driveDate?: string; driveTime?: string }) => driveTimes(d.driveDate ?? "").includes(d.driveTime ?? "") && dublinMs(d.driveDate!, d.driveTime!) > Date.now();

export const leadSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("enquiry"), carId, ...contact }),
    // At least one of make, model and type, so there is something to look for. `when` runs it even if another field failed.
    z
      .object({ type: z.literal("sourcing"), ...contact, ...sourcing })
      .refine((d) => Boolean(d.make || d.model || d.bodyType), { path: ["make"], message: SOURCING_CAR_ERROR, when: (p) => typeof p.value === "object" && p.value !== null }),
    z.object({ type: z.literal("general"), ...contact, ...general }),
    z.object({ type: z.literal("trade_in"), ...contact, ...tradeIn }),
    z.object({ type: z.literal("finance"), ...contact, ...finance }),
    z
      .object({ type: z.literal("test_drive"), ...contact, ...testDrive })
      .refine(onTheGrid, { path: ["driveTime"], message: BAD_DRIVE_TIME, when: (p) => typeof p.value === "object" && p.value !== null }),
  ])
  // D-12. `when` runs it even if another field failed, so a blank form shows every error at once.
  .refine((d) => Boolean(d.phone || d.email), {
    path: ["email"],
    message: CONTACT_ERROR,
    when: (p) => typeof p.value === "object" && p.value !== null,
  });

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadType = LeadInput["type"];

// Email subject words (D-02).
export const TYPE_LABELS: Record<LeadType, string> = {
  enquiry: "Enquiry",
  sourcing: "Find a car request",
  trade_in: "Trade-in valuation", // never the reg: nothing the buyer typed reaches a subject (T-03-29)
  finance: "Finance application",
  general: "Message from the website",
  test_drive: "Test drive request",
};
// Detail key to email label, in the order the email lists them; a new type's fields need only a line here.
export const DETAIL_LABELS: Record<string, string> = {
  reg: "Registration",
  mileage: "Mileage",
  make: "Make",
  model: "Model",
  bodyType: "Type of car",
  year: "Year",
  budgetMax: "Budget up to",
  deposit: "Deposit",
  term: "Term (months)",
  employment: "Employment status",
  driveDate: "Day",
  driveTime: "Time",
};
