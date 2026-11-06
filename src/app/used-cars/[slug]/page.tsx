import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BackToCars } from "@/components/stock/BackToCars";
import { stock } from "@/lib/stock";
import { carName, carTitle, formatKm, formatPrice } from "@/lib/stock/format";
import { FUEL_LABELS, GEARBOX_LABELS } from "@/lib/stock/types";

export async function generateMetadata({ params }: PageProps<"/used-cars/[slug]">): Promise<Metadata> {
  const car = await stock.getBySlug((await params).slug);
  return car ? { title: carName(car) } : {};
}

export default async function CarPage({ params }: PageProps<"/used-cars/[slug]">) {
  const car = await stock.getBySlug((await params).slug);
  if (!car) notFound();

  const specs: [string, string | undefined][] = [
    ["Year", String(car.year)],
    ["Mileage", car.mileageKm === undefined ? undefined : formatKm(car.mileageKm)],
    ["Fuel", car.fuel && FUEL_LABELS[car.fuel]],
    ["Transmission", car.gearbox && GEARBOX_LABELS[car.gearbox]],
    ["Body type", car.bodyType],
  ];

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <BackToCars />
      <h1 className="mt-6 text-display font-semibold">{carTitle(car)}</h1>
      <p className="text-heading font-semibold tabular-nums">{formatPrice(car.priceEur)}</p>
      {car.photos.length ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {car.photos.map((p, i) => (
            <div key={p.src} className="aspect-[4/3] bg-photo-bg">
              <Image
                src={p.src}
                width={900}
                height={675}
                alt={`${carName(car)}, photo ${i + 1} of ${car.photos.length}`}
                loading={i === 0 ? "eager" : undefined}
                fetchPriority={i === 0 ? "high" : undefined}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 flex aspect-[4/3] items-center justify-center bg-photo-bg text-meta text-text-2">No photo yet</p>
      )}
      <dl className="mt-8 grid max-w-md grid-cols-2 gap-x-4 gap-y-2">
        {specs.map(([label, value]) =>
          value ? (
            <div key={label} className="contents">
              <dt className="text-text-2">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </main>
  );
}
