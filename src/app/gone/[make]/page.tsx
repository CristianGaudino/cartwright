import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stock } from "@/lib/stock";

export const metadata: Metadata = { title: "Car no longer available", robots: { index: false } };

export default async function GonePage({ params }: PageProps<"/gone/[make]">) {
  const { make: slug } = await params;
  const make = (await stock.taxonomy()).makes.find((m) => m.slug === slug);
  if (!make) notFound();

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">This car is no longer available</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">It has been sold or taken off our site. Here is what else we have.</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={`/used-cars/${make.slug}`}
          className="inline-flex h-12 items-center rounded-control bg-accent px-6 font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100"
        >
          See more {make.label}
        </Link>
        <Link href="/used-cars" className="inline-flex min-h-11 items-center text-body font-semibold underline">
          See all used cars
        </Link>
      </div>
    </main>
  );
}
