import { ID, MAX_SAVED } from "@/lib/saved/ids";
import { stock } from "@/lib/stock";
import type { Car } from "@/lib/stock/types";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

// The /saved page's by-id lookup: the ids come from the buyer's localStorage, so they are untrusted.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids")?.split(",") ?? [];
  if (!raw.length || raw.length > MAX_SAVED || !raw.every((id) => ID.test(id))) {
    return Response.json({ error: "bad ids" }, { status: 400, headers });
  }
  const ids = [...new Set(raw)];
  const found = await stock.getByIds(ids);
  // The card uses neither the text nor the equipment, and a sale date never reaches the browser (owner rule, Phase 2).
  // Undefined keys are left out of the JSON.
  const cars = found.filter((c): c is Car => c !== null).map((c) => ({ ...c, description: undefined, features: undefined, soldAt: c.soldAt && "sold" }));
  const goneIds = ids.filter((_, i) => found[i] === null);
  return Response.json({ cars, goneIds }, { headers });
}
