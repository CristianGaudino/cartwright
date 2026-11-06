import { z } from "zod";
import { logLead } from "@/lib/log";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { carTitle } from "@/lib/stock/format";
import { buildLeadEmail } from "./email";
import { CONSENT, TYPE_LABELS, leadSchema } from "./schema";
import type { LeadType } from "./schema";

// The whole lead pipeline, framework-free (research Pattern 1): the server action only builds Deps and calls processLead.

export type Outcome = "stored" | "notify_failed" | "duplicate" | "invalid" | "captcha" | "rate" | "honeypot" | "error";
export type LeadResult =
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "failed"; kind: "captcha" | "rate" | "server" };

export interface LeadRow {
  id: string;
  clientRef: string;
  type: LeadType;
  carId: string | null;
  carSlug: string | null;
  carTitle: string | null;
  carPriceEur: number | null;
  sourcePath: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  details: Record<string, string | number>;
  photoKeys: string[];
  consentAt: Date;
  consentVersion: string;
}
export type CarSnapshot = Pick<LeadRow, "carId" | "carSlug" | "carTitle" | "carPriceEur">;

export interface LeadStore {
  exists(clientRef: string): Promise<boolean>;
  insert(row: LeadRow): Promise<boolean>; // false when the clientRef is already stored
  markNotified(id: string): Promise<void>;
}
export interface Mailer {
  send(m: { subject: string; text: string; replyTo?: string }): Promise<void>; // to and from are bound in deps
}
export interface Deps {
  store: LeadStore;
  mailer: Mailer;
  getCar(id: string): Promise<Car | null>;
  demo: boolean;
}

const OK: LeadResult = { status: "ok" };
const SERVER: LeadResult = { status: "failed", kind: "server" };
// Only the keys a schema knows are read from the form, so nothing else can reach the row (LED-03).
const KEYS = ["type", "carId", "clientRef", "sourcePath", "name", "phone", "email", "message", "consent"] as const;

// The one place car fields are set, for every lead type. The car always comes from the provider, never from the form (T-03-07).
// No carId (sourcing, trade-in, finance from /finance): all four null. Unknown or sold car: null, so the lead is refused (Phase 2 D-05).
export async function snapshotCar(carId: string | undefined, getCar: Deps["getCar"]): Promise<CarSnapshot | null> {
  if (carId === undefined) return { carId: null, carSlug: null, carTitle: null, carPriceEur: null };
  const car = await getCar(carId);
  if (!car || isSold(car)) return null;
  return { carId: car.id, carSlug: car.slug, carTitle: carTitle(car), carPriceEur: car.priceEur };
}

// Logs exactly one line per request, with only the lead id, type and outcome (D-08). Nothing from a caught error is ever
// logged or returned: a Drizzle error message carries the bound values (research Pitfall 1).
// ctx.ip feeds the rate limiter (03-08); it is never stored.
export async function processLead(fd: FormData, ctx: { ip: string }, deps: Deps): Promise<LeadResult> {
  if (String(fd.get("website") ?? "") !== "") {
    logLead({ type: "n/a", outcome: "honeypot" });
    return OK; // a bot sees the normal success (D-05)
  }

  const raw: Record<string, string> = {};
  for (const k of KEYS) {
    const v = fd.get(k);
    if (typeof v === "string") raw[k] = v;
  }
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    logLead({ type: Object.hasOwn(TYPE_LABELS, raw.type ?? "") ? (raw.type as LeadType) : "n/a", outcome: "invalid" });
    return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  const input = parsed.data;

  let leadId: string | undefined;
  try {
    const car = await snapshotCar(input.carId, deps.getCar);
    if (!car) {
      logLead({ type: input.type, outcome: "invalid" });
      return SERVER;
    }
    if (await deps.store.exists(input.clientRef)) {
      logLead({ type: input.type, outcome: "duplicate" });
      return OK;
    }

    const row: LeadRow = {
      id: crypto.randomUUID(),
      clientRef: input.clientRef,
      type: input.type,
      ...car,
      sourcePath: input.sourcePath,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      message: input.message ?? null,
      details: {},
      photoKeys: [],
      consentAt: new Date(),
      consentVersion: CONSENT.version,
    };
    leadId = row.id;

    // insert is false when another request with the same clientRef was stored first: a double submit that passed exists at the same moment (T-03-16).
    if (!(await deps.store.insert(row))) {
      logLead({ leadId, type: input.type, outcome: "duplicate" });
      return OK;
    }

    // Awaited inline, not deferred: after() work can be cut off on Workers (research Anti-Patterns).
    try {
      await deps.mailer.send({ ...buildLeadEmail(row, { demo: deps.demo }), replyTo: row.email ?? undefined });
      await deps.store.markNotified(row.id);
    } catch {
      // The row is the record, so the buyer still gets ok. notified_at stays empty for the owner to find (03-06 runbook).
      // A markNotified failure lands here too, which errs on the safe side: the row reads as not notified.
      logLead({ leadId, type: input.type, outcome: "notify_failed" });
      return OK;
    }
    logLead({ leadId, type: input.type, outcome: "stored" });
    return OK;
  } catch {
    logLead({ leadId, type: input.type, outcome: "error" });
    return SERVER;
  }
}
