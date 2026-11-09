import type { NextRequest } from "next/server";
import { requireEnv } from "@/lib/env";
import { getBindings } from "@/lib/leads/bindings";
import { verifyPhotoSig } from "@/lib/leads/photos";

// The only way to read a trade-in photo: a signed, expiring link from the dealer email (D-13, T-03-32). The bucket has no
// public address. Nothing about the key or the signature is logged.
const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
const refuse = (status: number) => new Response(null, { status, headers: HEADERS });

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  // Every check runs before the bucket is touched.
  if (!/^(trade-in|sourcing)\//.test(key) || key.includes("..") || !exp || !sig) return refuse(403);
  if (!(await verifyPhotoSig(key, exp, sig, requireEnv("PHOTO_LINK_SECRET")))) return refuse(403);

  const bucket = getBindings().LEAD_PHOTOS;
  if (!bucket) throw new Error("Missing binding LEAD_PHOTOS");
  const object = await bucket.get(key);
  if (!object) return refuse(404);
  return new Response(object.body, { headers: { ...HEADERS, "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream" } });
}
