import { z } from "zod";
import { logLead } from "@/lib/log";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { carTitle } from "@/lib/stock/format";
import { buildLeadEmail } from "./email";
import type { PhotoBucket } from "./bindings";
import { CONSENT, dublinMs, emailKey, phoneKey, PHOTO_LIMITS, PHOTO_MIN_ERROR, PHOTO_STORED_MAX_BYTES, PHOTO_TOTAL_ERROR, PHOTO_TOTAL_MAX_BYTES, TEST_DRIVE, photoCountError, photoError } from "./constants";
import { signPhotoPath, signSlotPath, sniffImage } from "./photos";
import { DETAIL_LABELS, TYPE_LABELS, leadSchema } from "./schema";
import type { LeadType } from "./schema";

// The whole lead pipeline, framework-free (research Pattern 1): the server action only builds Deps and calls processLead.

export type Outcome = "stored" | "notify_failed" | "duplicate" | "invalid" | "captcha" | "rate" | "honeypot" | "taken" | "again" | "full" | "release_failed" | "cleanup_failed" | "error";
export type LeadResult =
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "failed"; kind: "captcha" | "rate" | "gone" | "taken" | "again" | "full" | "server" };

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
// Test drive holds (#166): one row per request, unique on car and start time, on phone key and car, and on email key and car (drive_holds).
// A person is the same phone or, when both have one, the same email.
export type Asker = { phoneKey: string; emailKey: string | null };
export interface HoldStore {
  // "taken" when that car and time are already held, "again" when this person already has a pending hold on this car
  take(leadId: string, carId: string, startsAt: Date, who: Asker): Promise<"ok" | "taken" | "again">;
  pending(who: Asker, from: Date): Promise<string[]>; // the cars this person holds from `from` on
  free(leadId: string): Promise<void>;
  get(leadId: string): Promise<{ carId: string; startsAt: Date } | null>;
  times(carId: string, from: Date): Promise<Date[]>; // held start times from `from` on, for the picker
}
export interface Mailer {
  send(m: { subject: string; text: string; replyTo?: string }): Promise<void>; // to and from are bound in deps
}
export interface Deps {
  store: LeadStore;
  holds: HoldStore;
  mailer: Mailer;
  getCar(id: string): Promise<Car | null>;
  limiter: { allow(key: string): Promise<boolean> };
  verifyTurnstile(token: string, ip: string): Promise<boolean>;
  demo: boolean;
  bucket: Pick<PhotoBucket, "put" | "delete">; // LEAD_PHOTOS, private EU R2 (D-13); only the signed route reads it
  photoLinkSecret(): string; // read only when a lead has photos or is a test drive, so other leads never need it
}

const OK: LeadResult = { status: "ok" };
const SERVER: LeadResult = { status: "failed", kind: "server" };
// Only the keys a schema knows are read from the form, so nothing else can reach the row (LED-03).
const KEYS = ["type", "carId", "clientRef", "sourcePath", "name", "phone", "email", "message", "consent", ...Object.keys(DETAIL_LABELS)];

// The one place car fields are set, for every lead type. The car always comes from the provider, never from the form (T-03-07).
// No carId (sourcing, general, trade-in or finance not from a car): all four null. Unknown or sold car: null, so the lead is refused (Phase 2 D-05).
export async function snapshotCar(carId: string | undefined, getCar: Deps["getCar"]): Promise<CarSnapshot | null> {
  if (carId === undefined) return { carId: null, carSlug: null, carTitle: null, carPriceEur: null };
  const car = await getCar(carId);
  if (!car || isSold(car)) return null;
  return { carId: car.id, carSlug: car.slug, carTitle: carTitle(car), carPriceEur: car.priceEur };
}

type Photo = { file: Blob; ext: string; contentType: string };

// Trade-in and find-a-car photos, checked by their bytes and the caps before anything is stored (T-03-30, T-03-31). The phone already
// shrank them (03-14), so a refusal here means a forged or broken request.
async function checkPhotos(files: Blob[], { min, max }: { min: number; max: number }): Promise<{ photos: Photo[] } | { error: string }> {
  if (files.length < min) return { error: PHOTO_MIN_ERROR };
  if (files.length > max) return { error: photoCountError(max) };
  if (files.reduce((n, f) => n + f.size, 0) > PHOTO_TOTAL_MAX_BYTES) return { error: PHOTO_TOTAL_ERROR };
  const photos: Photo[] = [];
  for (const file of files) {
    const type = sniffImage(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    // The name is the buyer's own and only goes back to them; capped so a forged one cannot bloat the answer.
    if (!type || file.size > PHOTO_STORED_MAX_BYTES) return { error: photoError((file instanceof File ? file.name : "").slice(0, 100) || "A file") };
    photos.push({ file, ...type });
  }
  return { photos };
}

// Logs exactly one line per request, with only the lead id, type and outcome (D-08). Nothing from a caught error is ever
// logged or returned: a Drizzle error message carries the bound values (research Pitfall 1).
// ctx.ip feeds the rate limiter and the bot check; it is never stored.
// Order (D-05, research Pitfall 5): honeypot, rate limit, fields, then Turnstile, so a typo never spends the single-use token.
export async function processLead(fd: FormData, ctx: { ip: string }, deps: Deps): Promise<LeadResult> {
  if (String(fd.get("website") ?? "") !== "") {
    logLead({ type: "n/a", outcome: "honeypot" });
    return OK; // a bot sees the normal success (D-05)
  }

  let type: LeadType | "n/a" = "n/a";
  let leadId: string | undefined;
  try {
    if (!(await deps.limiter.allow(ctx.ip))) {
      logLead({ type, outcome: "rate" });
      return { status: "failed", kind: "rate" };
    }

    const raw: Record<string, string> = {};
    for (const k of KEYS) {
      const v = fd.get(k);
      if (typeof v === "string") raw[k] = v;
    }
    const parsed = leadSchema.safeParse(raw);
    // Other lead types ignore photos. Checked with the fields, so a bad photo never spends the Turnstile token.
    const limits = Object.hasOwn(PHOTO_LIMITS, raw.type ?? "") ? PHOTO_LIMITS[raw.type as keyof typeof PHOTO_LIMITS] : undefined;
    const checked = limits ? await checkPhotos(fd.getAll("photos").filter((v) => typeof v !== "string"), limits) : { photos: [] };
    if (!parsed.success || "error" in checked) {
      logLead({ type: Object.hasOwn(TYPE_LABELS, raw.type ?? "") ? (raw.type as LeadType) : "n/a", outcome: "invalid" });
      const fieldErrors = parsed.success ? {} : (z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
      return { status: "invalid", fieldErrors: "error" in checked ? { ...fieldErrors, photos: [checked.error] } : fieldErrors };
    }
    const input = parsed.data;
    type = input.type;

    if (!(await deps.verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), ctx.ip))) {
      logLead({ type, outcome: "captcha" });
      return { status: "failed", kind: "captcha" };
    }

    const asked = await snapshotCar("carId" in input ? input.carId : undefined, deps.getCar);
    // A valuation is a lead with or without a car of ours: one whose chosen car sold meanwhile is kept, with no car.
    const car = asked ?? (input.type === "trade_in" ? await snapshotCar(undefined, deps.getCar) : null);
    if (!car) {
      logLead({ type: input.type, outcome: "invalid" });
      return { status: "failed", kind: "gone" }; // sold or removed since the buyer opened the form
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
      details: Object.fromEntries(Object.entries(input).filter(([k, v]) => Object.hasOwn(DETAIL_LABELS, k) && v !== undefined)),
      photoKeys: [],
      consentAt: new Date(),
      consentVersion: CONSENT.version,
    };
    leadId = row.id;

    // A test drive holds its car and time before the lead is stored, so no lead is ever left without its hold; the unique indexes refuse a
    // second request for the same car and time, or from the same phone or email for the same car, even one sent at the same moment. Every
    // failure after this frees the hold again; the refusals here took nothing, so they free nothing.
    const startsAt = input.type === "test_drive" ? new Date(dublinMs(input.driveDate, input.driveTime)) : undefined;
    if (startsAt) {
      const who = { phoneKey: phoneKey(input.phone!), emailKey: emailKey(input.email) }; // a test drive always has a phone (schema)
      const cars = await deps.holds.pending(who, new Date());
      // shortcut: counted before the insert, so two requests at the same moment could make a fourth; the 5/min/IP limit and Turnstile keep
      // that rare. Upgrade to a conditional insert if the dealer ever sees more than maxPending from one person.
      const refused = cars.includes(row.carId!) ? "again" : cars.length >= TEST_DRIVE.maxPending ? "full" : await deps.holds.take(row.id, row.carId!, startsAt, who); // a test drive always has its car (snapshotCar)
      if (refused !== "ok") {
        logLead({ leadId, type: input.type, outcome: refused });
        return { status: "failed", kind: refused };
      }
    }
    const release = async () => {
      if (startsAt) await deps.holds.free(row.id).catch(() => logLead({ leadId, type: input.type, outcome: "release_failed" })); // the time stays held until it passes
    };

    // Photos go in before the row, under the lead's random id; the row keeps keys, never URLs (D-13). A failure from here to
    // the insert deletes what this request put, so no orphan photo is left (T-03-35).
    const keys = row.photoKeys;
    const cleanup = async () => {
      if (keys.length) await deps.bucket.delete(keys).catch(() => logLead({ leadId, type: input.type, outcome: "cleanup_failed" })); // the retention backstop deletes them
    };
    let inserted: boolean;
    try {
      for (const [i, p] of checked.photos.entries()) {
        const key = `${type === "sourcing" ? "sourcing" : "trade-in"}/${row.id}/${i + 1}.${p.ext}`;
        keys.push(key);
        await deps.bucket.put(key, p.file, { httpMetadata: { contentType: p.contentType } });
      }
      inserted = await deps.store.insert(row);
    } catch (e) {
      await cleanup();
      await release();
      throw e;
    }

    // insert is false when another request with the same clientRef was stored first: a double submit that passed exists at
    // the same moment (T-03-16). The stored lead keeps the other request's photos, so this one's are deleted.
    if (!inserted) {
      await cleanup();
      await release();
      logLead({ leadId, type: input.type, outcome: "duplicate" });
      return OK;
    }

    // Awaited inline, not deferred: after() work can be cut off on Workers (research Anti-Patterns).
    try {
      const photoPaths = await Promise.all(keys.map(async (k) => signPhotoPath(k, deps.photoLinkSecret())));
      const slotPath = startsAt && (await signSlotPath(row.id, startsAt, deps.photoLinkSecret()));
      await deps.mailer.send({ ...buildLeadEmail(row, { demo: deps.demo, photoPaths, slotPath }), replyTo: row.email ?? undefined });
    } catch {
      // The dealer was not told, so the buyer is not told "thanks": they see "we could not send this, call us" and their details
      // stay in the form. The row stays (notified_at empty, for the owner to find, 03-06 runbook); the form sends a fresh
      // clientRef on the retry, so it is stored and emailed again rather than answered as a duplicate.
      // A test drive's hold goes too: the buyer is told to try again, and their retry must not find their own time taken.
      await release();
      logLead({ leadId, type: input.type, outcome: "notify_failed" });
      return SERVER;
    }
    // The email went. If only this bookkeeping fails the buyer still gets ok, and the row reads as not notified.
    await deps.store.markNotified(row.id).catch(() => logLead({ leadId, type: input.type, outcome: "notify_failed" }));
    logLead({ leadId, type: input.type, outcome: "stored" });
    return OK;
  } catch {
    logLead({ leadId, type, outcome: "error" });
    return SERVER;
  }
}
