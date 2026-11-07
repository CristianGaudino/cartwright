import type { Metadata } from "next";
import Link from "next/link";
import { accentButton } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">We could not find that page</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">The link may be old or mistyped.</p>
      <Link
        href="/used-cars"
        className={`mt-6 inline-flex items-center ${accentButton}`}
      >
        See all used cars
      </Link>
    </main>
  );
}
