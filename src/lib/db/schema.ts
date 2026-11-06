import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { LeadType } from "@/lib/leads/schema";

export type LeadStatus = "new"; // the admin phase (#20) adds more

// Columns locked under D-03 (03-06 Task 1, research-columns). The deploy migrates before new code runs, so every change
// from here on must be additive (scripts/check-migrations.sh). No IP, user agent or bot-check token is stored (LED-03).
export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientRef: uuid("client_ref").notNull().unique(), // one per form instance: retries and double taps store one row
    // text, not pgEnum, so new lead types and statuses stay additive
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
    details: jsonb().$type<Record<string, string | number>>().notNull().default({}), // type fields: test drive, trade-in, finance
    photoKeys: text("photo_keys").array().notNull().default([]), // R2 keys, never URLs
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    consentVersion: text("consent_version").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }), // null: the dealer email did not go (docs/lead-retention.md)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);
