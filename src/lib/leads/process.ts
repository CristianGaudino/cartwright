import { z } from "zod";
import { logLead } from "@/lib/log";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { carTitle } from "@/lib/stock/format";
import { buildLeadEmail } from "./email";
import type { PhotoBucket } from "./bindings";
import { CONSENT, PHOTO_COUNT_ERROR, PHOTO_MAX_COUNT, PHOTO_STORED_MAX_BYTES, PHOTO_TOTAL_ERROR, PHOTO_TOTAL_MAX_BYTES, photoError } from "./constants";
import { signPhotoPath, sniffImage } from "./photos";
import { DETAIL_LABELS, TYPE_LABELS, leadSchema } from "./schema";
import type { LeadType } from "./schema";

// The whole lead pipeline, framework-free (research Pattern 1): the server action only builds Deps and calls processLead.

export type Outcome = "stored" | "notify_failed" | "duplicate" | "invalid" | "captcha" | "rate" | "honeypot" | "error";
export type LeadResult =
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "failed"; kind: "captcha" | "rate" | "gone" | "server" };

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
  limiter: { allow(key: string): Promise<boolean> };
  verifyTurnstile(token: string, ip: string): Promise<boolean>;
  demo: boolean;
  bucket: Pick<PhotoBucket, "put" | "delete">; // LEAD_PHOTOS, private EU R2 (D-13); only the signed route reads it
  photoLinkSecret(): string; // read only when a lead has photos, so other leads never need it
}

const OK: LeadResult = { status: "ok" };
const SERVER: LeadResult = { status: "failed", kind: "server" };
// Only the keys a schema knows are read from the form, so nothing else can reach the row (LED-03).
const KEYS = ["type", "carId", "clientRef", "sourcePath", "name", "phone", "email", "message", "consent", ...Object.keys(DETAIL_LABELS)];

// The one place car fields are set, for every lead type. The car always comes from the provider, never from the form (T-03-07).
// No carId (sourcing, trade-in, finance from /finance): all four null. Unknown or sold car: null, so the lead is refused (Phase 2 D-05).
export async function snapshotCar(carId: string | undefined, getCar: Deps["getCar"]): Promise<CarSnapshot | null> {
  if (carId === undefined) return { carId: null, carSlug: null, carTitle: null, carPriceEur: null };
  const car = await getCar(carId);
  if (!car || isSold(car)) return null;
  return { carId: car.id, carSlug: car.slug, carTitle: carTitle(car), carPriceEur: car.priceEur };
}

type Photo = { file: Blob; ext: string; contentType: string };

// Trade-in photos, checked by their bytes and the caps before anything is stored (T-03-30, T-03-31). The phone already
// shrank them (03-14), so a refusal here means a forged or broken request.
async function checkPhotos(files: Blob[]): Promise<{ photos: Photo[] } | { error: string }> {
  if (files.length > PHOTO_MAX_COUNT) return { error: PHOTO_COUNT_ERROR };
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
    const checked = raw.type === "trade_in" ? await checkPhotos(fd.getAll("photos").filter((v) => typeof v !== "string")) : { photos: [] };
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

    const car = await snapshotCar("carId" in input ? input.carId : undefined, deps.getCar);
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

    // Photos go in before the row, under the lead's random id; the row keeps keys, never URLs (D-13). A failure from here to
    // the insert deletes what this request put, so no orphan photo is left (T-03-35).
    const keys = row.photoKeys;
    const cleanup = async () => {
      if (keys.length) await deps.bucket.delete(keys).catch(() => {});
    };
    let inserted: boolean;
    try {
      for (const [i, p] of checked.photos.entries()) {
        const key = `trade-in/${row.id}/${i + 1}.${p.ext}`;
        keys.push(key);
        await deps.bucket.put(key, p.file, { httpMetadata: { contentType: p.contentType } });
      }
      inserted = await deps.store.insert(row);
    } catch (e) {
      await cleanup();
      throw e;
    }

    // insert is false when another request with the same clientRef was stored first: a double submit that passed exists at
    // the same moment (T-03-16). The stored lead keeps the other request's photos, so this one's are deleted.
    if (!inserted) {
      await cleanup();
      logLead({ leadId, type: input.type, outcome: "duplicate" });
      return OK;
    }

    // Awaited inline, not deferred: after() work can be cut off on Workers (research Anti-Patterns).
    try {
      const photoPaths = await Promise.all(keys.map(async (k) => signPhotoPath(k, deps.photoLinkSecret())));
      await deps.mailer.send({ ...buildLeadEmail(row, { demo: deps.demo, photoPaths }), replyTo: row.email ?? undefined });
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
    logLead({ leadId, type, outcome: "error" });
    return SERVER;
  }
}
