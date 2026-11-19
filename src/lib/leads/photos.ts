// Trade-in photo checks and the signed dealer links (D-13, #166). Pure: the secret is a parameter, so nothing here reads env.

// The type comes from the bytes, never from the file name or the browser's type (T-03-30).
export function sniffImage(b: Uint8Array): { ext: "jpg" | "png" | "webp"; contentType: string } | null {
  const at = (sig: number[], from = 0) => sig.every((x, i) => b[from + i] === x);
  if (at([0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", contentType: "image/png" };
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) return { ext: "webp", contentType: "image/webp" };
  return null;
}

const enc = new TextEncoder();
const hmacKey = (secret: string, usage: KeyUsage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const sign = async (payload: string, exp: number, secret: string) =>
  b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(`${payload}.${exp}`))));

// A capability link for the dealer email: HMAC-SHA256 over "{key}.{exp}", 7 days by default (research A10).
export async function signPhotoPath(key: string, secret: string, ttlSec = 7 * 86400): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/lead-photos/${key}?exp=${exp}&sig=${await sign(key, exp, secret)}`;
}

// A test drive's "Free this slot" link (#166), signed with the same secret over "drive-slot/{lead id}". No photo key starts with
// drive-slot/ and the photo route takes only trade-in/ and sourcing/ keys, so neither link opens the other. It works until the drive's
// start: after that the daily purge removes the hold anyway.
const slotPayload = (leadId: string) => `drive-slot/${leadId}`;
export async function signSlotPath(leadId: string, startsAt: Date, secret: string): Promise<string> {
  const exp = Math.floor(startsAt.getTime() / 1000);
  return `/test-drive-slot/${leadId}?exp=${exp}&sig=${await sign(slotPayload(leadId), exp, secret)}`;
}

/** Whether a "Free this slot" link's parts are genuine and not expired. Takes them as they come from a URL or a form. */
export async function verifySlotLink(leadId: string, exp: unknown, sig: unknown, secret: string): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(leadId) || typeof exp !== "string" || typeof sig !== "string") return false;
  return verifyLinkSig(slotPayload(leadId), exp, sig, secret);
}

// crypto.subtle.verify compares in constant time. An expired, malformed or tampered link is false.
export async function verifyLinkSig(payload: string, exp: string, sig: string, secret: string): Promise<boolean> {
  if (!/^\d{1,12}$/.test(exp) || Number(exp) < Date.now() / 1000 || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  const bytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), bytes, enc.encode(`${payload}.${exp}`));
}
