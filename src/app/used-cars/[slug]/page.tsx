import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JsonLd } from "@/components/JsonLd";
import { BuyBox } from "@/components/car/BuyBox";
import { CarGallery } from "@/components/car/CarGallery";
import { AboutCar, Equipment, SimilarCars, Specifications } from "@/components/car/CarSections";
import { BackToCars } from "@/components/stock/BackToCars";
import { resolveLanding } from "@/components/landing/data";
import { LandingPage } from "@/components/landing/LandingPage";
import { SoldBadge } from "@/components/stock/SoldBadge";
import { stock } from "@/lib/stock";
import { carName } from "@/lib/stock/format";
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
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <JsonLd data={carJsonLd(car)} />
      <BackToCars />
      <div className="mt-6 grid grid-cols-1 gap-y-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-8">
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
        </div>
        <div className="mt-6 lg:col-span-2">
          <SimilarCars car={car} cars={similar} />
        </div>
      </div>
    </main>
  );
}
