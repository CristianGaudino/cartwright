import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/stock/ListingCard";
import { stock } from "@/lib/stock";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import { accentButton, pageMain } from "@/components/ui";

export const metadata: Metadata = { title: "Car No Longer Available", robots: { index: false } };

// Three used cars, of the given makes (none: any make), newest first. A stock failure shows none rather than failing the page.
const few = (make: string[]) => stock.query({ ...DEFAULT_QUERY, make, pageSize: 3 }).then((r) => r.cars, () => []);

export default async function GonePage({ params }: PageProps<"/gone/[make]">) {
  const { make: slug } = await params;
  const make = (await stock.taxonomy()).makes.find((m) => m.slug === slug);
  if (!make) notFound();
  // Others of the same make first; with none left, the newest cars.
  const sameMake = await few([make.slug]);
  const cars = sameMake.length ? sameMake : await few([]);

  return (
    <main className={pageMain}>
      <h1 className="text-display font-semibold">This Car Is No Longer Available</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">It has been sold or taken off our site.{cars.length > 0 && " Here is what else we have."}</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={`/used-cars/${make.slug}`}
          className={`inline-flex items-center ${accentButton}`}
        >
          See more {make.label}
        </Link>
        <Link href="/used-cars" className="inline-flex min-h-11 items-center text-body font-semibold underline">
          See All Used Cars
        </Link>
      </div>
      {cars.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car, i) => (
            <ListingCard key={car.id} car={car} priority={i < 2} />
          ))}
        </div>
      )}
    </main>
  );
}
