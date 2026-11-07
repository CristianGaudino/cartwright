import Link from "next/link";
import { BackToCars } from "@/components/stock/BackToCars";
import { ChevronRightIcon } from "@/components/stock/icons";
import type { Car } from "@/lib/stock/types";

const crumb = "-my-2.5 inline-flex min-h-11 items-center hover:underline";

// Stock, make, model, as in the mockup. Stock goes back to the list the buyer came from (BackToCars); the others are the landing pages.
export function Breadcrumb({ car }: { car: Pick<Car, "make" | "makeSlug" | "model" | "modelSlug"> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-meta">
      <BackToCars />
      <ChevronRightIcon className="size-4 text-text-2" />
      <Link href={`/used-cars/${car.makeSlug}`} className={crumb}>
        {car.make}
      </Link>
      <ChevronRightIcon className="size-4 text-text-2" />
      <Link href={`/used-cars/${car.makeSlug}/${car.modelSlug}`} className={crumb}>
        {car.model}
      </Link>
    </nav>
  );
}
