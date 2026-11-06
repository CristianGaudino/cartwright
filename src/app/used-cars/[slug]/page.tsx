import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BuyBox } from "@/components/car/BuyBox";
import { BackToCars } from "@/components/stock/BackToCars";
import { SoldBadge } from "@/components/stock/SoldBadge";
import { stock } from "@/lib/stock";
import { carName, carTitle } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

// Resolved once per request for generateMetadata and the page. Plan 02-07 adds make and body kinds in front of the car lookup.
const resolveSlug = cache(async (slug: string) => {
  const car = await stock.getBySlug(slug);
  return car ? ({ kind: "car", car } as const) : null;
});

export async function generateMetadata({ params }: PageProps<"/used-cars/[slug]">): Promise<Metadata> {
  const found = await resolveSlug((await params).slug);
  return found ? { title: `${found.car.year} ${carTitle(found.car)} for sale` } : {};
}

export default async function CarPage({ params }: PageProps<"/used-cars/[slug]">) {
  const found = await resolveSlug((await params).slug);
  if (!found) notFound();
  const { car } = found;
  const photo = car.photos[0];

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <BackToCars />
      <div className="mt-6 grid grid-cols-1 gap-y-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-8">
        {/* Gallery slot: plan 02-05 swaps in the full gallery. */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-photo-bg lg:col-start-1">
          {photo ? (
            <Image src={photo.src} width={900} height={675} alt={`${carName(car)}, photo 1 of ${car.photos.length}`} loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
          ) : (
            <p className="flex h-full items-center justify-center text-meta text-text-2">No photo yet</p>
          )}
          {isSold(car) && <SoldBadge hidden className="absolute left-4 top-4 z-20" />}
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6 lg:self-start">
          <BuyBox car={car} />
        </div>
      </div>
    </main>
  );
}
