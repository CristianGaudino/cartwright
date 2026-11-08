import { z } from "zod";
import { FINANCE } from "@/lib/finance/finance.config";
import { financeable } from "@/lib/finance/payment";
import { BUDGETS } from "@/lib/stock/types";
import { BAD_KM, BAD_REG, CONTACT_ERROR, EMPLOYMENT, KM_PATTERN, LIMITS, REG_PATTERN } from "./constants";

// The lead validation, run on the server. Client components import ./constants, never this file (it brings zod).

const tooLong = (n: number) => `Use ${n} characters or fewer.`;
const BAD_PHONE = "Enter a phone number we can call.";
// An empty or blank field counts as not given.
const given = <T extends z.ZodType>(s: T) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s);

const contact = {
  clientRef: z.uuid(),
  sourcePath: z.string().regex(/^\/[A-Za-z0-9._~\-/]{0,200}$/),
  name: given(z.string({ error: "Enter your name." }).trim().max(LIMITS.name, tooLong(LIMITS.name))),
  // Loose on purpose: digits, spaces, plus, hyphens and brackets, with at least 7 digits.
  phone: given(
    z
      .string()
      .trim()
      .max(LIMITS.phone, tooLong(LIMITS.phone))
      .refine((v) => /^\+?[0-9 ()-]+$/.test(v) && v.replace(/\D/g, "").length >= 7, BAD_PHONE)
      .optional(),
  ),
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
  make: given(z.string().trim().max(60, tooLong(60)).optional()),
  model: given(z.string().trim().max(60, tooLong(60)).optional()),
};
// No carId key on the car-less types, so a forged one is dropped and snapshotCar stores no car (T-03-27).
const sourcing = {
  ...carText,
  budgetMax: given(
    z
      .enum(BUDGETS.map(String) as [string, ...string[]], { error: "Choose a budget from the list." })
      .transform(Number)
      .optional(),
  ),
  message: given(z.string({ error: "Tell us what you are looking for." }).trim().max(LIMITS.message, tooLong(LIMITS.message))),
};

// D-14: plain fields, no reg lookup. Commas in the mileage are stripped; the year is the car's, so up to next year.
const nextYear = () => new Date().getUTCFullYear() + 1;
const tradeIn = {
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

// D-17: deposit, term and employment, plus the price the buyer worked out on /finance (a car page has the car's own price).
// The car is optional: none from /finance, the car's id from a car page.
const BAD_DEPOSIT = "Enter the deposit in euros, numbers only.";
const finance = {
  carId: given(carId.optional()),
  price: given(
    z
      .string()
      .transform((v) => v.replaceAll(",", "").trim())
      .pipe(z.string().regex(/^\d{1,6}$/))
      .transform(Number)
      .refine(financeable, "Enter a price between €1,000 and €250,000.")
      .optional(),
  ),
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

export const leadSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("enquiry"), carId, ...contact }),
    z.object({ type: z.literal("sourcing"), ...contact, ...sourcing }),
    z.object({ type: z.literal("general"), ...contact, ...general }),
    z.object({ type: z.literal("trade_in"), ...contact, ...tradeIn }),
    z.object({ type: z.literal("finance"), ...contact, ...finance }),
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
};
// Detail key to email label, in the order the email lists them; a new type's fields need only a line here.
export const DETAIL_LABELS: Record<string, string> = {
  reg: "Registration",
  mileage: "Mileage",
  make: "Make",
  model: "Model",
  year: "Year",
  budgetMax: "Budget up to",
  price: "Price entered",
  deposit: "Deposit",
  term: "Term (months)",
  employment: "Employment status",
};
