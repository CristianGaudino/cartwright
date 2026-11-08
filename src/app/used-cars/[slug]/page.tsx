import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/JsonLd";
import { BuyBox } from "@/components/car/BuyBox";
import { Breadcrumb } from "@/components/car/Breadcrumb";
import { CarGallery } from "@/components/car/CarGallery";
import { AboutCar, Equipment, SimilarCars, Specifications } from "@/components/car/CarSections";
import { FinanceCalculator } from "@/components/finance/FinanceCalculator";
import { resolveLanding } from "@/components/landing/data";
import { LandingPage } from "@/components/landing/LandingPage";
import { SoldBadge } from "@/components/stock/SoldBadge";
import { pageMain, slash } from "@/components/ui";
import { financeable } from "@/lib/finance/payment";
import { stock } from "@/lib/stock";
import { carName, carSummary } from "@/lib/stock/format";
import { landingMetadata, landingPath } from "@/lib/stock/landing";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import { carJsonLd, carMetadata } from "@/lib/stock/seo";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

// Up to 3 cars to buy: same make first, then same body type; never the car itself.
async function similarCars(car: Car) {
  const pools = await Promise.all([
    stock.query({ ...DEFAULT_QUERY, make: [car.makeSlug], pageSize: 6 }),
    ...(car.bodySlug ? [stock.query({ ...DEFAULT_QUERY, body: [car.bodySlug], pageSize: 6 })] : []),
  ]);
  const seen = new Set([car.id]);
  return pools.flatMap((r) => r.cars).filter((c) => !seen.has(c.id) && seen.add(c.id)).slice(0, 3);
}

// Make first, then body type (both looked up in taxonomy() by resolveLanding), then car (D-06). Resolved once per request for generateMetadata and the page.
const CAR_SLUG = /-\d+$/; // make and body slugs never end in digits, so a car-shaped slug skips the taxonomy scan
const resolveSlug = cache(async (slug: string) => {
  const landing = CAR_SLUG.test(slug) ? null : await resolveLanding(slug);
  if (landing) return { kind: "landing", landing } as const;
  const car = await stock.getBySlug(slug);
  return car ? ({ kind: "car", car } as const) : null;
});

export async function generateMetadata({ params }: PageProps<"/used-cars/[slug]">): Promise<Metadata> {
  const found = await resolveSlug((await params).slug);
  if (!found) return {};
  if (found.kind === "landing") return landingMetadata(found.landing.landing, found.landing.facts, landingPath(found.landing.landing));
  return carMetadata(found.car);
}

export default async function CarPage({ params }: PageProps<"/used-cars/[slug]">) {
  const found = await resolveSlug((await params).slug);
  if (!found) notFound();
  if (found.kind === "landing") return <LandingPage data={found.landing} />;
  const { car } = found;
  const similar = await similarCars(car);

  return (
    <main className={pageMain}>
      <JsonLd data={carJsonLd(car)} />
      <Breadcrumb car={car} />
      <div className="mt-6 grid grid-cols-1 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-10">
        <div className="relative lg:col-start-1">
          <CarGallery photos={car.photos} name={carName(car)} />
          {isSold(car) && <SoldBadge hidden className="pointer-events-none absolute left-4 top-4 z-20" />}
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6 lg:self-start">
          <BuyBox car={car} />
        </div>
        <div className="mt-6 flex flex-col gap-12 lg:col-start-1">
          <AboutCar car={car} />
          <Specifications car={car} />
          <Equipment car={car} />
          {/* In stock only: a sold car offers no finance (UI-SPEC section 7). Only the summary and price reach the client. */}
          {!isSold(car) && financeable(car.priceEur) && (
            <section className="flex flex-col gap-4">
              <h2 className={`text-heading font-semibold ${slash}`}>Finance</h2>
              <FinanceCalculator car={{ ...carSummary(car), priceEur: car.priceEur }} />
            </section>
          )}
        </div>
      </div>
      {/* Outside the grid on purpose: a sticky panel is held inside its grid container, so Similar cars in the same grid slid under it. */}
      <div className="mt-12">
        <SimilarCars car={car} cars={similar} />
      </div>
    </main>
  );
}
