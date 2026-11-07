import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
    details: text({ mode: "json" }).$type<Record<string, string | number>>().notNull().default({}), // type fields: test drive, trade-in, finance
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
