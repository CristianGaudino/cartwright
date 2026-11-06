import "server-only";
import { getDb } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { LEAD_FROM_EMAIL, isProduction } from "@/lib/site";
import { stock } from "@/lib/stock";
import { getBindings } from "./bindings";
import type { Deps, LeadStore, Mailer } from "./process";
import { createDrizzleStore } from "./store";
import { verifyTurnstile } from "./turnstile";

const getCar = (id: string) => stock.getById(id);

// In-memory stand-ins for E2E. They keep no personal data: the store remembers client refs only, the mailer drops the message.
function fakeDeps(): Deps {
  const refs = new Set<string>();
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
    mailer: { send: async () => {} },
    getCar,
    limiter: { allow: async () => true },
    verifyTurnstile: async (token) => token !== "",
    demo: true,
  };
}

// Neon through Drizzle. Built per call, so a missing DATABASE_URL throws inside processLead, which logs it as an error line.
const db = () => createDrizzleStore(getDb());
const store: LeadStore = {
  exists: (ref) => db().exists(ref),
  insert: (row) => db().insert(row),
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
    mailer,
    getCar,
    limiter,
    verifyTurnstile: (token, ip) => verifyTurnstile(token, ip, requireEnv("TURNSTILE_SECRET_KEY")),
    demo: !isProduction(),
  };
}

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
    const l = getBindings().LEAD_LIMITER;
    if (!l) throw new Error("Missing binding LEAD_LIMITER");
    return (await l.limit({ key })).success;
  },
};
