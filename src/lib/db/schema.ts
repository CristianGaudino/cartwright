import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { LeadType } from "@/lib/leads/schema";

export type LeadStatus = "new"; // the admin phase (#20) adds more

// Columns locked under D-03 (03-06 Task 1, research-columns). The deploy migrates before new code runs, so every change
// from here on must be additive (scripts/check-migrations.sh). No IP, user agent or bot-check token is stored (LED-03).
// SQLite (Cloudflare D1): ids are uuid text made by the app, times are epoch milliseconds, lists and details are JSON text.
export const leads = sqliteTable(
  "leads",
  {
    id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientRef: text("client_ref").notNull().unique(), // one per form instance: retries and double taps store one row
    // free text, so new lead types and statuses stay additive
    type: text().$type<LeadType>().notNull(),
    status: text().$type<LeadStatus>().notNull().default("new"),
    // Snapshot from the stock provider, never from the form (T-03-07)
    carId: text("car_id"),
    carSlug: text("car_slug"),
    carTitle: text("car_title"),
    carPriceEur: integer("car_price_eur"),
    sourcePath: text("source_path").notNull(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    message: text(),
    details: text({ mode: "json" }).$type<Record<string, string | number>>().notNull().default({}), // type fields: trade-in, sourcing, finance
    photoKeys: text("photo_keys", { mode: "json" }).$type<string[]>().notNull().default([]), // R2 keys, never URLs
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    consentVersion: text("consent_version").notNull(),
    notifiedAt: integer("notified_at", { mode: "timestamp_ms" }), // null: the dealer email did not go (docs/lead-retention.md)
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);

// A test drive request holds its car and start time (#166). The unique index is what stops two requests for one car and time, even at the
// same moment. phone_key and email_key are the buyer's phone and email normalised (phoneKey and emailKey in leads/constants.ts), kept only to
// cap requests per person: one pending per car (the phone and email unique indexes, so two at once can't both get in; SQLite lets NULLs
// repeat, so a hold with no email blocks nothing) and a few across cars. They go with the hold. Deleted by the dealer's "Free this slot"
// link, or by the daily purge once the time has passed; the lead itself stays. Both null on holds taken before they existed.
export const driveHolds = sqliteTable(
  "drive_holds",
  {
    leadId: text("lead_id").primaryKey(),
    carId: text("car_id").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    phoneKey: text("phone_key"),
    emailKey: text("email_key"),
  },
  // phone or email first, so the same indexes serve the per-person count
  (t) => [
    uniqueIndex("drive_holds_car_time_unique").on(t.carId, t.startsAt),
    uniqueIndex("drive_holds_phone_car_unique").on(t.phoneKey, t.carId),
    uniqueIndex("drive_holds_email_car_unique").on(t.emailKey, t.carId),
  ],
);
