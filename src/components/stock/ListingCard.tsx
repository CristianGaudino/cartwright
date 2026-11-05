import Image from "next/image";
import Link from "next/link";
import { carMeta, carName, carTitle, formatPrice } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

export function ListingCard({ car, priority }: { car: Car; priority: boolean }) {
  const href = `/used-cars/${car.slug}`;
  const photo = car.photos[0];
  return (
    <article className="group relative overflow-hidden rounded-card border border-hairline bg-card transition-[box-shadow,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)]:hover:shadow-lift">
      <div className="relative aspect-[4/3] bg-photo-bg">
        {photo ? (
          <Link href={href} tabIndex={-1} aria-hidden="true">
            <Image
              src={photo.src}
              width={900}
              height={675}
              alt={`${carName(car)}, photo 1 of ${car.photos.length}`}
              loading={priority ? "eager" : undefined}
              fetchPriority={priority ? "high" : undefined}
              className="h-full w-full object-cover"
            />
          </Link>
        ) : (
          <p className="flex h-full items-center justify-center text-meta text-text-2">No photo yet</p>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="text-heading font-semibold tabular-nums">{formatPrice(car.priceEur)}</p>
        <h2 className="line-clamp-2 text-body font-semibold">
          <Link href={href} className="after:absolute after:inset-0">
            {carTitle(car)}
          </Link>
        </h2>
        <p className="line-clamp-2 text-meta text-text-2">{carMeta(car)}</p>
      </div>
    </article>
  );
}
