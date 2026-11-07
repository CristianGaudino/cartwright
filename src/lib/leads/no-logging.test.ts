import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoCars from "@/lib/stock/demo-cars.json";
import type { Car } from "@/lib/stock/types";
import { processLead } from "./process";
import type { Deps, Outcome } from "./process";

// D-08: no lead payload ever reaches a log, on any path. Every console method and both process streams are spied, and each
// call is serialised in full (errors included) and searched for each sentinel.
const cars = demoCars as Car[];
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt)!;

const NAME = "ZZ-SENTINEL-NAME";
const PHONE = "087 919 2939";
const EMAIL = "zz-sentinel@example.com";
const MESSAGE = "ZZ-SENTINEL-MESSAGE about the car";
const REG = "ZZ-SENTINEL"; // within the 12-character reg limit
const SENTINELS = [NAME, PHONE, EMAIL, MESSAGE, REG, "ZZ_SENTINEL_CODE", "E_DAILY_LIMIT_EXCEEDED"];

function form(fields: Record<string, string> = {}) {
  const fd = new FormData();
  const all = {
    type: "enquiry",
    carId: live.id,
    clientRef: crypto.randomUUID(),
    sourcePath: `/used-cars/${live.slug}`,
    name: NAME,
    phone: PHONE,
    email: EMAIL,
    message: MESSAGE,
    consent: "yes",
    "cf-turnstile-response": "ok",
    ...fields,
  };
  for (const [k, v] of Object.entries(all)) fd.set(k, v);
  return fd;
}

// Shaped like drizzle-orm's DrizzleQueryError: the message and params carry every bound value, the cause the Postgres detail.
function drizzleError() {
  const cause = Object.assign(new Error(`duplicate key value violates unique constraint, Key (email)=(${EMAIL})`), { code: "ZZ_SENTINEL_CODE", detail: `Key (name)=(${NAME})` });
  return Object.assign(new Error(`Failed query: insert into "leads" ...\nparams: ${NAME},${PHONE},${EMAIL},${MESSAGE}`), {
    query: 'insert into "leads"',
    params: [NAME, PHONE, EMAIL, MESSAGE],
    cause,
  });
}

function deps(over: Partial<Deps> = {}): Deps {
  return {
    store: { exists: async () => false, insert: async () => true, markNotified: async () => {} },
    mailer: { send: async () => {} },
    getCar: async (id) => cars.find((c) => c.id === id) ?? null,
    limiter: { allow: async () => true },
    verifyTurnstile: async (t) => t === "ok",
    demo: true,
    bucket: { put: async () => {}, get: async () => null, delete: async () => {} },
    photoLinkSecret: () => "test-secret",
    ...over,
  };
}

const cases: [string, Outcome, () => FormData, () => Deps][] = [
  ["stored", "stored", form, deps],
  ["duplicate", "duplicate", form, () => deps({ store: { exists: async () => true, insert: async () => true, markNotified: async () => {} } })],
  ["invalid", "invalid", () => form({ email: "not-an-email", consent: "" }), deps],
  ["captcha", "captcha", () => form({ "cf-turnstile-response": "bad" }), deps],
  ["rate", "rate", form, () => deps({ limiter: { allow: async () => false } })],
  ["honeypot", "honeypot", () => form({ website: NAME }), deps],
  ["sold car", "invalid", () => form({ carId: sold.id }), deps],
  [
    "store insert throws a Drizzle-shaped error",
    "error",
    form,
    () =>
      deps({
        store: {
          exists: async () => false,
          insert: async () => {
            throw drizzleError();
          },
          markNotified: async () => {},
        },
      }),
  ],
  [
    "mailer throws a coded error with the email in it",
    "notify_failed",
    form,
    () =>
      deps({
        mailer: {
          send: async () => {
            throw Object.assign(new Error(`daily limit reached sending for ${EMAIL}`), { code: "E_DAILY_LIMIT_EXCEEDED" });
          },
        },
      }),
  ],
  [
    "a trade-in photo write throws with the reg in it",
    "error",
    () => {
      const fd = form({ type: "trade_in", carId: "", reg: REG, mileage: "1000" });
      fd.append("photos", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], `${REG}.jpg`));
      return fd;
    },
    () =>
      deps({
        bucket: {
          put: async () => {
            throw new Error(`put failed for ${REG} ${NAME}`);
          },
          get: async () => null,
          delete: async () => {},
        },
      }),
  ],
  [
    "getCar throws",
    "error",
    form,
    () =>
      deps({
        getCar: async () => {
          throw drizzleError();
        },
      }),
  ],
];

const serialise = (args: unknown[]) => args.map((a) => `${String(a)} ${inspect(a, { depth: 10, showHidden: true })}`).join(" ");

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];
let streamSpies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  const methods = Object.keys(console).filter((k) => typeof (console as unknown as Record<string, unknown>)[k] === "function") as (keyof Console)[];
  consoleSpies = methods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  streamSpies = [vi.spyOn(process.stdout, "write").mockImplementation(() => true), vi.spyOn(process.stderr, "write").mockImplementation(() => true)];
});
afterEach(() => vi.restoreAllMocks());

describe("no lead payload reaches a log (D-08)", () => {
  it.each(cases)("%s", async (_, outcome, fd, d) => {
    await processLead(fd(), { ip: "203.0.113.1" }, d());

    const consoleCalls = consoleSpies.flatMap((s) => s.mock.calls as unknown[][]);
    const out = [...consoleCalls, ...streamSpies.flatMap((s) => s.mock.calls as unknown[][])].map(serialise).join("\n");
    for (const s of SENTINELS) expect(out).not.toContain(s);

    // Exactly one logLead line: a single JSON string with only the lead id, type and outcome.
    expect(consoleCalls).toHaveLength(1);
    expect(consoleCalls[0]).toHaveLength(1);
    const line = JSON.parse(String(consoleCalls[0][0]));
    expect(Object.keys(line).every((k) => ["leadId", "type", "outcome"].includes(k))).toBe(true);
    expect(line.outcome).toBe(outcome);
  });
});
