import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ID } from "@/lib/saved/ids";
import { stock } from "@/lib/stock";

// The old site's car links: /car-details/?4359698=2017 Porsche Cayenne. The number is the same stock id the new site uses, so a link
// from Google or a shared message goes to the right car. A car that has gone, or a link with no id, lands on the stock list.
export async function GET(req: NextRequest) {
  const id = [...req.nextUrl.searchParams.keys()].find((k) => ID.test(k));
  const car = id ? await stock.getById(id) : null;
  return NextResponse.redirect(new URL(car ? `/used-cars/${car.slug}` : "/used-cars", req.url), car ? 301 : 302);
}
