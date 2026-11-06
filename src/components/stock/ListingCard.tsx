import { PhotoCarousel } from "@/components/stock/PhotoCarousel";
import Link from "next/link";
import { carMeta, carName, carTitle, formatPrice } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

export function ListingCard({ car, priority }: { car: Car; priority: boolean }) {
  const href = `/used-cars/${car.slug}`;
  return (
    <article className="group relative overflow-hidden rounded-card border border-hairline bg-card transition-[box-shadow,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)]:hover:shadow-lift">
      <div className="relative aspect-[4/3] bg-photo-bg">
        <PhotoCarousel photos={car.photos} href={href} label={carName(car)} priority={priority} />
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
