import { z } from "zod";
import { CONTACT_ERROR, LIMITS, TIMES, tomorrow } from "./constants";

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

const carId = z.string().regex(/^\d{1,12}$/);

// Type fields (D-10, D-11). Only these keys reach a row's details.
const testDrive = {
  preferredDay: given(z.iso.date({ error: "Choose a day from the calendar." }).refine((d) => d >= tomorrow(), "Choose a day from tomorrow on.").optional()),
  preferredTime: given(z.enum(Object.keys(TIMES) as [keyof typeof TIMES], { error: "Choose a time from the list." }).default("any")),
};

export const leadSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("enquiry"), carId, ...contact }),
    z.object({ type: z.literal("test_drive"), carId, ...contact, ...testDrive }),
    z.object({ type: z.literal("reserve"), carId, ...contact }),
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
export const TYPE_LABELS: Record<LeadType, string> = { enquiry: "Enquiry", test_drive: "Test drive request", reserve: "Reservation request" };
// Detail key to email label, in the order the email lists them; a new type's fields need only a line here.
export const DETAIL_LABELS: Record<string, string> = { preferredDay: "Preferred day", preferredTime: "Preferred time" };
