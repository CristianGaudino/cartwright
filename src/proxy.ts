import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stock } from "@/lib/stock";

// Next 16 has no gone(); a rewrite with a status is the documented way to answer 410 (D-03).
// Make and body slugs never end in digits, so only a car-shaped slug reaches the provider.
const CAR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*-\d+$/;

export async function proxy(req: NextRequest) {
  const slug = req.nextUrl.pathname.split("/")[2] ?? "";
  if (slug.length > 120 || !CAR_SLUG.test(slug)) return NextResponse.next();
  const hit = await stock.lookup(slug);
  // The target is a constant prefix plus the provider's own make slug, never request input (T-02-08).
  return hit?.state === "gone" ? NextResponse.rewrite(new URL("/gone/" + hit.makeSlug, req.url), { status: 410 }) : NextResponse.next();
}

export const config = { matcher: "/used-cars/:slug" };
