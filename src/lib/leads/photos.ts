// Trade-in photo checks and dealer links (D-13). Pure: the secret is a parameter, so nothing here reads env.

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

// A capability link for the dealer email: HMAC-SHA256 over "{key}.{exp}", 7 days by default (research A10).
export async function signPhotoPath(key: string, secret: string, ttlSec = 7 * 86400): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(`${key}.${exp}`)));
  return `/lead-photos/${key}?exp=${exp}&sig=${b64url(sig)}`;
}

// crypto.subtle.verify compares in constant time. An expired, malformed or tampered link is false.
export async function verifyPhotoSig(key: string, exp: string, sig: string, secret: string): Promise<boolean> {
  if (!/^\d{1,12}$/.test(exp) || Number(exp) < Date.now() / 1000 || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  const bytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), bytes, enc.encode(`${key}.${exp}`));
}
