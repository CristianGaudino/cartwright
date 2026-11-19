// A half-filled lead form kept for this tab only (sessionStorage), so a reload or a wrong tap does not lose what was typed. Never the
// contact details or the consent: the browser fills the details again by itself, and keeping less personal data is the rule. Gone when
// the form is sent, or when the tab closes.
// A reg points at its owner too; a test drive's day and time go stale (a past day, a time since taken), so they are picked again.
const NEVER = new Set(["name", "phone", "email", "consent", "reg", "driveDate", "driveTime"]);

type Fields = Record<string, string>;
const strings = (v: unknown): Fields =>
  v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string")) : {};

// What is worth keeping: typed fields that differ from what the page filled in itself.
export function draftOf(values: Fields, prefill: Fields = {}): Fields {
  return Object.fromEntries(Object.entries(values).filter(([k, v]) => !NEVER.has(k) && v.trim() !== "" && v !== prefill[k]));
}

// What the buyer typed wins over what the page fills in, unless the page now fills that field with something else (another car in the
// calculator, another search's make): then the typed value was an answer to a different question, and the page's value stands.
export function readDraft(key: string, prefill: Fields = {}): Fields {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? "{}");
    const { for: was, values } = (stored ?? {}) as { for?: unknown; values?: unknown };
    const over = strings(was);
    return Object.fromEntries(Object.entries(draftOf(strings(values))).filter(([k]) => over[k] === prefill[k]));
  } catch {
    return {}; // storage blocked or edited: start empty
  }
}

export function saveDraft(key: string, values: Fields, prefill: Fields = {}) {
  const draft = draftOf(values, prefill);
  const over = Object.fromEntries(Object.keys(draft).filter((k) => k in prefill).map((k) => [k, prefill[k]]));
  try {
    if (Object.keys(draft).length) sessionStorage.setItem(key, JSON.stringify({ for: over, values: draft }));
    else sessionStorage.removeItem(key);
  } catch {
    // storage full or blocked: the form still works, it just is not kept
  }
}
