import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">We could not find that page</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">The link may be old or mistyped.</p>
      <Link
        href="/used-cars"
        className="mt-6 inline-flex h-12 items-center rounded-control bg-accent px-6 font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100"
      >
        See all used cars
      </Link>
    </main>
  );
}
