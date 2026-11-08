import { SaveButton } from "@/components/saved/SaveButton";
import { PhotoCarousel } from "@/components/stock/PhotoCarousel";
import { SoldBadge } from "@/components/stock/SoldBadge";
import Link from "next/link";
import { carMeta, carName, formatPrice } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

export function ListingCard({ car, priority }: { car: Car; priority: boolean }) {
  const href = `/used-cars/${car.slug}`;
  return (
    <article data-card className="group relative overflow-hidden rounded-card border border-hairline bg-card transition-shadow duration-200 ease-out [@media(hover:hover)]:hover:shadow-lift">
      <div data-card-photo className="relative aspect-[4/3] bg-photo-bg">
        <PhotoCarousel photos={car.photos} href={href} label={carName(car)} priority={priority} />
        {/* The word in the price slot is what screen readers hear; this badge is the same word for the eye. */}
        {isSold(car) && <SoldBadge hidden className="absolute left-4 top-4 z-20" />}
        {/* z-20 and outside the title link: above the carousel and never a card tap. Sold cars keep it. */}
        <SaveButton id={car.id} label={`Save ${carName(car)}`} variant="card" />
      </div>
      <div data-card-body className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          {/* The make above the model, as in the mockup; both are inside the one link, so its name is still "Make Model Variant". */}
          <h2 className="min-w-0 text-body font-semibold">
            <Link href={href} className="after:absolute after:inset-0">
              <span className="block text-meta font-normal text-text-2">{car.make}</span>
              <span className="line-clamp-2 block">{[car.model, car.variant].filter(Boolean).join(" ")}</span>
            </Link>
          </h2>
          <p data-price className={`shrink-0 text-heading font-semibold tabular-nums ${isSold(car) ? "text-text-2" : ""}`}>{isSold(car) ? "Sold" : formatPrice(car.priceEur)}</p>
        </div>
        <p className="line-clamp-2 text-meta text-text-2">{carMeta(car)}</p>
      </div>
    </article>
  );
}
