import "server-only";
import { stock } from "@/lib/stock";
import type { Deps } from "./process";

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
    demo: true,
  };
}

const notConfigured = (what: string) => () => Promise.reject(new Error(`${what} not configured`));
let fakes: Deps | undefined;

export function getDeps(): Deps {
  // E2E only: set by playwright.config.ts for its local server, never in wrangler.jsonc, a workflow or a deploy.
  // shortcut: this branch is in every build, so if E2E_FAKE_BACKENDS is ever defined on the Worker (dashboard variable,
  // [vars], .dev.vars) leads are accepted and silently dropped. Never define it there; 03-10 adds the CI check.
  if (process.env.E2E_FAKE_BACKENDS === "1") return (fakes ??= fakeDeps());
  // Real dependencies never fall back to a fake (research Pitfall 4): until 03-05 and 03-06 land, every lead fails loudly.
  return {
    store: { exists: notConfigured("Lead store"), insert: notConfigured("Lead store"), markNotified: notConfigured("Lead store") },
    mailer: { send: notConfigured("Mailer") },
    getCar,
    demo: true, // 03-05 wires isProduction
  };
}
