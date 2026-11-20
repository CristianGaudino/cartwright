import "server-only";
import { getDb } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { LEAD_FROM_EMAIL, isProduction } from "@/lib/site";
import { stock } from "@/lib/stock";
import { getBindings } from "./bindings";
import type { Asker, Deps, HoldStore, LeadStore, Mailer } from "./process";
import { createDrizzleHolds, createDrizzleStore } from "./store";
import { verifyTurnstile } from "./turnstile";

const getCar = (id: string) => stock.getById(id);

// In-memory stand-ins for E2E. They keep little personal data: the store remembers client refs only, the holds a car, a time and the phone
// and email keys (as drive_holds does), the mailer drops the message.
function fakeDeps(): Deps {
  const refs = new Set<string>();
  const held = new Map<string, { carId: string; startsAt: Date; who: Asker }>(); // by lead id
  const same = (a: Asker, b: Asker) => a.phoneKey === b.phoneKey || (a.emailKey !== null && a.emailKey === b.emailKey);
  return {
    store: {
      exists: async (ref) => refs.has(ref),
      insert: async (row) => {
        if (refs.has(row.clientRef)) return false;
        refs.add(row.clientRef);
        return true;
      },
      markNotified: async () => {},
    },
    holds: {
      take: async (leadId, carId, startsAt, who) => {
        if ([...held.values()].some((h) => h.carId === carId && same(h.who, who) && +h.startsAt > Date.now())) return "again";
        if ([...held.values()].some((h) => h.carId === carId && +h.startsAt === +startsAt)) return "taken";
        held.set(leadId, { carId, startsAt, who });
        return "ok";
      },
      pending: async (who, from) => [...held.values()].filter((h) => same(h.who, who) && h.startsAt > from).map((h) => h.carId),
      free: async (leadId) => void held.delete(leadId),
      get: async (leadId) => {
        const h = held.get(leadId);
        return h ? { carId: h.carId, startsAt: h.startsAt } : null;
      },
      times: async (carId, from) => [...held.values()].filter((h) => h.carId === carId && h.startsAt >= from).map((h) => h.startsAt),
    },
    mailer: { send: async () => {} },
    getCar,
    limiter: { allow: async () => true },
    verifyTurnstile: async (token) => token !== "",
    demo: true,
    bucket: { put: async () => {}, delete: async () => {} }, // photos are dropped, like the mail
    photoLinkSecret: () => "e2e-photo-link-secret",
  };
}

// D1 through Drizzle. Built per call, so a missing DB binding throws inside processLead, which logs it as an error line.
const db = () => createDrizzleStore(getDb());
const holdsDb = () => createDrizzleHolds(getDb());
const holds: HoldStore = {
  take: (...a) => holdsDb().take(...a),
  pending: (...a) => holdsDb().pending(...a),
  free: (id) => holdsDb().free(id),
  get: (id) => holdsDb().get(id),
  times: (...a) => holdsDb().times(...a),
};
const store: LeadStore = {
  exists: (ref) => db().exists(ref),
  // A lead nobody is told about is worse than a refused one: with no address to email, refuse before storing, so the buyer is
  // told to call instead of waiting for a reply that never comes. Set LEAD_TO_EMAIL before the bot-check secret.
  insert: async (row) => {
    requireEnv("LEAD_TO_EMAIL");
    return db().insert(row);
  },
  markNotified: (id) => db().markNotified(id),
};
let fakes: Deps | undefined;

export function getDeps(): Deps {
  // E2E only: set by playwright.config.ts for its local server, never in wrangler.jsonc, a workflow or a deploy.
  // shortcut: this branch is in every build, so if E2E_FAKE_BACKENDS is ever defined on the Worker (dashboard variable,
  // [vars], .dev.vars) leads are accepted and silently dropped. Never define it there; 03-10 adds the CI check.
  if (process.env.E2E_FAKE_BACKENDS === "1") return (fakes ??= fakeDeps());
  // Real dependencies never fall back to a fake (research Pitfall 4): a missing binding or secret fails the lead loudly.
  return {
    store,
    holds,
    mailer,
    getCar,
    limiter,
    verifyTurnstile: (token, ip) => verifyTurnstile(token, ip, requireEnv("TURNSTILE_SECRET_KEY")),
    demo: !isProduction(),
    bucket,
    photoLinkSecret: () => requireEnv("PHOTO_LINK_SECRET"),
  };
}

// Trade-in photos (D-13): wrangler.jsonc LEAD_PHOTOS, a private EU bucket. Read per call, like the other bindings.
const photos = () => {
  const b = getBindings().LEAD_PHOTOS;
  if (!b) throw new Error("Missing binding LEAD_PHOTOS");
  return b;
};
const bucket: Deps["bucket"] = {
  put: (key, value, opts) => photos().put(key, value, opts),
  delete: (keys) => photos().delete(keys),
};

// Cloudflare Email Service (D-01). From the onboarded domain to the dealer; the buyer's address only goes in replyTo (D-02).
const mailer: Mailer = {
  async send({ subject, text, replyTo }) {
    const email = getBindings().EMAIL;
    if (!email) throw new Error("Missing binding EMAIL");
    await email.send({ to: requireEnv("LEAD_TO_EMAIL"), from: LEAD_FROM_EMAIL, subject, text, ...(replyTo && { replyTo }) });
  },
};

// 5 requests a minute per IP (wrangler.jsonc LEAD_LIMITER; 03-01 proved it on wrangler dev, A3).
const limiter: Deps["limiter"] = {
  async allow(key) {
    if (!key) return true; // no IP to count (Cloudflare always sends one): one shared bucket would lock every buyer out; Turnstile still applies
    const l = getBindings().LEAD_LIMITER;
    if (!l) throw new Error("Missing binding LEAD_LIMITER");
    return (await l.limit({ key })).success;
  },
};
